import * as dotenv from "dotenv";
import { format, add } from "date-fns";
import atprotoApi from "@atproto/api";
import fs from "fs";
import twitterText from "twitter-text";

import { getScheduleList } from "./get-schedule-list.js";

dotenv.config();

const { BskyAgent, RichText } = atprotoApi;

const NOW = new Date();
const TODAY = format(NOW, "yyyy-MM-dd");
const DAY_OF_WEEK = ["㈰", "㈪", "㈫", "㈬", "㈭", "㈮", "㈯"]

const SEGMENTER = new Intl.Segmenter("ja", {granularity: "grapheme"});

const MISSKEY_INSTANCE = process.env.MISSKEY_INSTANCE;
const MISSKEY_ACCESS_TOKEN = process.env.MISSKEY_ACCESS_TOKEN;
const BLUESKY_SERVICE = process.env.BLUESKY_SERVICE;
const BLUESKY_IDENTIFIER = process.env.BLUESKY_IDENTIFIER;
const BLUESKY_APP_PASSWORD = process.env.BLUESKY_APP_PASSWORD;

const BLUESKY_AGENT = new BskyAgent({ service: BLUESKY_SERVICE });

const MAX_LENGTH_OF_MISSKEY = 3000;
const MAX_LENGTH_OF_BLUESKY = 300;
// const MAX_LENGTH_OF_TWITTER = 280;

const SCHEDULE = await getScheduleList();
// const SCHEDULE_LAST_MODIFIED = Date(SCHEDULE_FILE.lastModified);
SCHEDULE.sort((a, b) => a[0] - b[0]);

const TEXT_FIRST_LINE = format(NOW, "yyyy年M月d日") + DAY_OF_WEEK[NOW.getDay()] +  "の音MAD周辺配信スケジュール";

let textForMisskey = [TEXT_FIRST_LINE];
let textForBluesky = [TEXT_FIRST_LINE];
// let textForTwitter = [TEXT_FIRST_LINE];

if (SCHEDULE.length > 0) {
	for (let plan of SCHEDULE) {
		let planTime;
		
		if (plan[1]) {
			planTime = format(plan[0], "H:mm～");
		} else {
			planTime = "時刻不明";
		}

		generateTextForMisskey(plan, planTime);
		generateTextForBluesky(plan, planTime);
		// generateTextForTwitter(plan);
	}

	post();
}

function generateTextForMisskey(plan, planTime) {
	let planLink;

	if (plan[5] === null) {
		planLink = "";
	} else {
		planLink = " ?[" + plan[4] + "](" + plan[5] + ")";
	}

	const PLAN_TEXT = plan[2] + "\n" + planTime + planLink;

	// 既存の文字数＋追加するテキストの文字数＋改行と（続く）分の8文字
	if ([...textForMisskey[textForMisskey.length - 1]].length + [...PLAN_TEXT].length + 8 > MAX_LENGTH_OF_MISSKEY) {
		textForMisskey[textForMisskey.length - 1] += "\n\n（続く）";
		textForMisskey.push(PLAN_TEXT);
	} else {
		textForMisskey[textForMisskey.length - 1] += "\n\n" + PLAN_TEXT;
	}
}

function generateTextForBluesky(plan, planTime) {
	let planLink;

	if (plan[5] === null) {
		planLink = "";
	} else {
		planLink = " " + plan[5];
	}

	const PLAN_TEXT = plan[2] + "\n" + planTime + planLink;
	const SEGMENTED_TEXT_FOR_BLUESKY = SEGMENTER.segment(textForBluesky[textForBluesky.length - 1]);
	const SEGMENTED_PLAN_TEXT = SEGMENTER.segment(PLAN_TEXT);

	// 既存の文字数＋追加するテキストの文字数＋改行と（続く）分の8文字
	if ([...SEGMENTED_TEXT_FOR_BLUESKY].length + [...SEGMENTED_PLAN_TEXT].length + 8 > MAX_LENGTH_OF_BLUESKY) {
		textForBluesky[textForBluesky.length - 1] += "\n\n（続く）";
		textForBluesky.push(PLAN_TEXT);
	} else {
		textForBluesky[textForBluesky.length - 1] += "\n\n" + PLAN_TEXT;
	}
}

/* function generateTextForTwitter(plan) {
	const PLAN_TEXT = plan.name + "\n" + plan.time + "～ " + plan.link.url;

	// 既存の文字数＋追加するテキストの文字数＋改行と（続く）
	if(twitterText.parseTweet(textForTwitter[textForTwitter.length - 1] + "\n\n" + PLAN_TEXT + "\n\n（続く）").valid) {
		textForTwitter[textForTwitter.length - 1] += "\n\n" + PLAN_TEXT;
	} else {
		textForTwitter[textForTwitter.length - 1] += "\n\n（続く）";
		textForTwitter.push(PLAN_TEXT);
	}
} */

async function post() {
	console.log(textForMisskey);

	/*for (let text of textForMisskey) {
		var replyId = await postToMisskey(text, replyId);
	}

	{
		await BLUESKY_AGENT.login({
			identifier: BLUESKY_IDENTIFIER,
			password: BLUESKY_APP_PASSWORD
		});
		
		let rootPost;
		for (let i = 0; i < textForBluesky.length; i++) {
			var parentPost = await postToBluesky(textForBluesky[i], rootPost, parentPost);

			if (i === 0) {
				rootPost = parentPost;
			}
		}
	}*/

	// postToTwitter(textForTwitter);
}

async function postToMisskey(text, replyId) {
	let parameters = {
		i: MISSKEY_ACCESS_TOKEN,
		text: text,
		visibility: "public"
	};

	if (replyId !== undefined) {
		parameters.replyId = replyId;
	}

	return await fetch(MISSKEY_INSTANCE + "/api/notes/create", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(parameters)
	}).then(response => {
		return response.json();
	}).then(json => {
		return json.createdNote.id;
	});
}

async function postToBluesky(text, rootPost, parentPost) {
	const RICH_TEXT = new RichText({ text: text });
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

/* async function postToTwitter(text) {

} */