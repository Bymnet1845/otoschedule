import * as dotenv from "dotenv";
import { format } from "date-fns";
import atprotoApi from "@atproto/api";
import fs from "fs";
import twitterText from "twitter-text";

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

const SCHEDULE_FILE = JSON.parse(fs.readFileSync("schedule.json").toString());
const SCHEDULE = SCHEDULE_FILE[TODAY];
// const SCHEDULE_LAST_MODIFIED = Date(SCHEDULE_FILE.lastModified);

const TEXT_FIRST_LINE = format(NOW, "yyyy年M月d日") + DAY_OF_WEEK[NOW.getDay()] +  "の音周辺配信スケジュール";
const TEXT_SCHELUDES_NOT_FOUND = "\n\n今日予定されている配信の情報はありません。";

let textForMisskey = [TEXT_FIRST_LINE];
let textForBluesky = [TEXT_FIRST_LINE];
// let textForTwitter = [TEXT_FIRST_LINE];

if (SCHEDULE === undefined) {
	textForMisskey[0] += TEXT_SCHELUDES_NOT_FOUND;
	textForBluesky[0] += TEXT_SCHELUDES_NOT_FOUND;
	// textForTwitter[0] += TEXT_SCHELUDES_NOT_FOUND;
} else {
	for (let plan of SCHEDULE.broadcast) {
		generateTextForMisskey(plan);
		generateTextForBluesky(plan);
		// generateTextForTwitter(plan);
	}
}

post();

function generateTextForMisskey(plan) {
	const PLAN_TEXT = plan.name + "\n" + plan.time + "～ ?[" + plan.link.title + "](" + plan.link.url + ")";

	// 既存の文字数＋追加するテキストの文字数＋改行と（続く）分の8文字
	if ([...textForMisskey[textForMisskey.length - 1]].length + [...PLAN_TEXT].length + 8 > MAX_LENGTH_OF_MISSKEY) {
		textForMisskey[textForMisskey.length - 1] += "\n\n（続く）";
		textForMisskey.push(PLAN_TEXT);
	} else {
		textForMisskey[textForMisskey.length - 1] += "\n\n" + PLAN_TEXT;
	}
}

function generateTextForBluesky(plan) {
	const PLAN_TEXT = plan.name + "\n" + plan.time + "～ " + plan.link.url;
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
	for (let text of textForMisskey) {
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
	}

	// postToTwitter(textForTwitter);
}

async function postToMisskey(text, replyId) {
	let parameters = {
		i: MISSKEY_ACCESS_TOKEN,
		text: text,
		visibility: "followers"
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