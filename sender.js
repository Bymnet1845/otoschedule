import * as dotenv from "dotenv";
import atprotoApi from "@atproto/api";
const { BskyAgent, RichText } = atprotoApi;
import { MessageFlags, heading, hyperlink } from "discord.js";
import outputLog from "./output-log.js";

dotenv.config();

export default class Sender {
	constructor(preface, scheduleList) {
		this.preface = preface;
		this.scheduleList = scheduleList;
	}

	async sendToMisskey() {
		const MISSKEY_INSTANCE = process.env.MISSKEY_INSTANCE;
		const MISSKEY_ACCESS_TOKEN = process.env.MISSKEY_ACCESS_TOKEN;
		let messageList = [this.preface.mfm];
		let beforePostId;

		this.scheduleList.forEach((schedule) => {
			let scheduleText = `${schedule.type ? schedule.type : ""}${schedule.time}\n**<plain>${schedule.title}</plain>**\n[${schedule.link.title}](${schedule.link.url})`;

			if ([...messageList[messageList.length - 1]].length + [...scheduleText].length + 8 > 3000) {
				messageList[messageList.length - 1] += "\n\n（続く）";
				messageList.push(scheduleText);
			} else {
				messageList[messageList.length - 1] += "\n\n" + scheduleText;
			}
		});

		for (let message of messageList) {
			beforePostId = await post(message, beforePostId);
		}

		async function post(message, beforePostId) {
			try {
				let parameters = {
					i: MISSKEY_ACCESS_TOKEN,
					text: message,
					visibility: "specified"
				};

				if (beforePostId !== undefined) parameters.replyId = beforePostId;

				return await fetch(MISSKEY_INSTANCE + "/api/notes/create", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(parameters)
				}).then((response) => {
					return response.json();
				}).then((json) => {
					return json.createdNote.id;
				});
			} catch (error) {
				outputLog(error, "error");
			}
		}
	}

	async sendToBluesky() {
		const BLUESKY_SERVICE = process.env.BLUESKY_SERVICE;
		const BLUESKY_IDENTIFIER = process.env.BLUESKY_IDENTIFIER;
		const BLUESKY_APP_PASSWORD = process.env.BLUESKY_APP_PASSWORD;
		const BLUESKY_AGENT = new BskyAgent({ service: BLUESKY_SERVICE });
		const SEGMENTER = new Intl.Segmenter("ja", { granularity: "grapheme" });
		let messageList = [this.preface.plain];
		let rootPost, parentPost;

		this.scheduleList.forEach((schedule) => {
			const SCHEDULE_TEXT = (schedule.type ? schedule.type : "") + schedule.time + "\n" + schedule.title + "\n" + schedule.link.url;
			const SEGMENTED_SCHEDULE_TEXT = SEGMENTER.segment(SCHEDULE_TEXT);
			const SEGMENTED_LAST_MESSAGE = SEGMENTER.segment(messageList[messageList.length - 1]);

			if ([...SEGMENTED_LAST_MESSAGE].length + [...SEGMENTED_SCHEDULE_TEXT].length + 8 > 300) {
				messageList[messageList.length - 1] += "\n\n（続く）";
				messageList.push(SCHEDULE_TEXT);
			} else {
				messageList[messageList.length - 1] += "\n\n" + SCHEDULE_TEXT;
			}
		});

		try {
			await BLUESKY_AGENT.login({
				identifier: BLUESKY_IDENTIFIER,
				password: BLUESKY_APP_PASSWORD
			});

			for (let i = 0; i < messageList.length; i++) {
				parentPost = await post(messageList[i], rootPost, parentPost);
				if (i === 0) rootPost = parentPost;
			}
		} catch (error) {
			outputLog(error, "error");
		}

		async function post(message, rootPost, parentPost) {
			const RICH_TEXT = new RichText({ text: message });
			await RICH_TEXT.detectFacets(BLUESKY_AGENT);

			let parameters = {
				text: RICH_TEXT.text,
				facets: RICH_TEXT.facets,
				langs: ["ja-JP"]
			};

			if (rootPost !== undefined) {
				parameters.reply = {
					root: rootPost,
					parent: parentPost
				}
			}

			return await BLUESKY_AGENT.post(parameters);
		}
	}

	setDiscordOption(mentions) {
		let messageList = new Array();

		if (mentions) {
			let mentionText = "";
			if (mentions.roles) mentions.roles.forEach((role) => { mentionText += "<@&" + role + "> " });
			if (mentions.users) mentions.users.forEach((user) => { mentionText += "<@" + user + "> " });
			messageList.push(mentionText + "\n" + this.preface.plain);
		} else {
			messageList.push(this.preface.plain);
		}

		this.scheduleList.forEach((schedule) => {
			let scheduleLink;

			if (schedule.link.hasTitle) {
				scheduleLink = hyperlink(schedule.link.title, schedule.link.url);
			} else {
				scheduleLink = schedule.link.url;
			}

			let scheduleText = heading(schedule.title, 2) + "\n" + (schedule.type ? schedule.type : "") + schedule.time + "\n" + scheduleLink;

			if ([...messageList[messageList.length - 1]].length + [...scheduleText].length + 1 > 2000) {
				messageList.push(scheduleText);
			} else {
				messageList[messageList.length - 1] += "\n" + scheduleText;
			}
		});

		this.discordMessageList = messageList;
	}

	sendToDiscord(client, channelId) {
		let messageList = this.discordMessageList;

		try {
			messageList.forEach((message) => { client.channels.cache.get(channelId).send(message) });
		} catch (error) {
			outputLog(error, "error");
		}
	}

	async replyToDiscord(interaction, ephemeralEnabled = false) {
		let messageList = this.discordMessageList;

		try {
			let firstMessage = { content: messageList[0] };
			if (ephemeralEnabled) firstMessage.flags = MessageFlags.Ephemeral;
			await interaction.reply(firstMessage);

			for (let i = 1; i < messageList.length; i++) {
				let message = { content: messageList[i] };
				if (ephemeralEnabled) message.flags = MessageFlags.Ephemeral;
				await interaction.followUp(message);
			}
		} catch (error) {
			outputLog(error, "error");
		}
	}
}