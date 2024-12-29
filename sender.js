import * as dotenv from "dotenv";
import { format } from "date-fns";
import atprotoApi from "@atproto/api";
const { BskyAgent, RichText } = atprotoApi;

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
			let scheduleText = `${schedule.time}\n**<plain>${schedule.title}</plain>**\n[${schedule.link.title}](${schedule.link.url})`;

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
				console.log(format(Date.now(), "[yyyy-MM-dd HH:mm:ss]"));
				console.error(error);
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
			const SCHEDULE_TEXT = schedule.time + "\n" + schedule.title + "\n" + schedule.link.url;
			const SEGMENTED_SCHEDULE_TEXT = SEGMENTER.segment(SCHEDULE_TEXT);
			const SEGMENTED_LAST_MESSAGE = SEGMENTER.segment(messageList[messageList.length - 1]);

			if ([...SEGMENTED_LAST_MESSAGE].length + [...SEGMENTED_SCHEDULE_TEXT].length + 8 > 300) {
				messageList[messageList.length - 1] += "\n\n（続く）";
				messageList.push(SCHEDULE_TEXT);
			} else {
				messageList[messageList.length - 1] += "\n\n" + SCHEDULE_TEXT;
			}
		});

		console.log(messageList);

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
			console.log(format(Date.now(), "[yyyy-MM-dd HH:mm:ss]"));
			console.error(error);
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
}