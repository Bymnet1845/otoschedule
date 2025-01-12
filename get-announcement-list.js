import * as dotenv from "dotenv";
import outputLog from "./output-log.js";

dotenv.config();
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;

export default async function getAnnouncementList(startUnixTime, endUnixTime = false) {
	let announcementList = new Array();
	let announcementSheet = await fetch("https://sheets.googleapis.com/v4/spreadsheets/" + GOOGLE_SPREADSHEET_ID + "/values/announcement-list?valueRenderOption=UNFORMATTED_VALUE&key=" + GOOGLE_API_KEY, {
		method: "GET"
	}).then((response) => {
		return response.json();
	}).then((json) => {
		return json;
	}).catch((error) => {
		outputLog(error, "error");
	});

	if (endUnixTime) {
		announcementSheet.values
			.filter((announcement) => announcement[2] >= startUnixTime && announcement[2] <= endUnixTime)
			.sort((announcement1, announcement2) => (announcement1[0] - announcement2[0]))
			.forEach((announcement1) => {
				let announcement2 = {
					title: announcement1[4],
					content: { 
						bluesky: announcement1[5] ? announcement1[6] : false,
						misskey: announcement1[7] ? announcement1[8] : false,
						discord: announcement1[9] ? announcement1[10] : false
					}
				};

				announcementList.push(announcement2);
			});
	} else {
		announcementSheet.values
			.filter((announcement) => announcement[1] && announcement[2] <= startUnixTime && announcement[3] >= startUnixTime)
			.sort((announcement1, announcement2) => (announcement1[0] - announcement2[0]))
			.forEach((announcement1) => {
				let announcement2 = {
					title: announcement1[4],
					content: { 
						discord: announcement1[10]
					}
				};

				announcementList.push(announcement2);
			});
	}

	return announcementList;
}