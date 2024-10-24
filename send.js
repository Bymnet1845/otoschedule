import * as dotenv from "dotenv";

dotenv.config();

export default class Sender {
	constructor(preface, scheduleList) {
		this.preface = preface;
		this.scheduleList = scheduleList;
	}

	async sendToMisskey() {
		const MISSKEY_INSTANCE = process.env.MISSKEY_INSTANCE;
		const MISSKEY_ACCESS_TOKEN = process.env.MISSKEY_ACCESS_TOKEN;
		let messageList = [this.preface];
		let beforePostId;

		this.scheduleList.forEach((schedule) => {
			let scheduleText = "\n\n" + schedule.time + "\n" + schedule.title + "\n" + schedule.url;

			if ([...messageList[messageList.length - 1]].length + [...scheduleText].length + 6 > 200) {
				messageList[messageList.length - 1] += "\n\n（続く）";
				messageList.push(scheduleText);
			} else {
				messageList[messageList.length - 1] += scheduleText;
			}
		});

		for (let message of messageList) {
			beforePostId = await post(message, beforePostId);
		}

		async function post(message, beforePostId) {
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
		}
	}
}