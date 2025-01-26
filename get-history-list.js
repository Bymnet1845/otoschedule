import * as dotenv from "dotenv";
import { format } from "date-fns";

dotenv.config();
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
const DAY_OF_WEEK = ["日", "月", "火", "水", "木", "金", "土"];

export default async function getHistoryList(startUnixTime, endUnixTime) {
	let historyList = new Array();
	let historySheet = await fetch("https://sheets.googleapis.com/v4/spreadsheets/" + GOOGLE_SPREADSHEET_ID + "/values/history?valueRenderOption=UNFORMATTED_VALUE&key=" + GOOGLE_API_KEY, {
		method: "GET"
	}).then((response) => {
		return response.json();
	}).then((json) => {
		return json;
	});

	historySheet.values
		.filter((history) => history[0] >= startUnixTime && history[0] <= endUnixTime)
		.sort((history1, history2) => (history1[0] - history2[0]) * -1)
		.forEach((history1) => {
			let history2 = {
				id: history1[1],
				type: "",
				title: history1[5],
				service: history1[6],
				time: "",
				link: {
					url: history1[8],
					title: history1[7],
					hasTitle: history1[9]
				}
			};
			
			if (history1[2]) {
				history2.type = "【情報変更】";
			} else {
				history2.type = "【新規追加】";
			}
			
			const HISTORY_DATE_TIME = new Date(history1[3]);

			if (history1[4]) {
				history2.time += format(history1[3], "yyyy年M月d日（") + DAY_OF_WEEK[HISTORY_DATE_TIME.getDay()] + "） " + format(history1[3], "HH:mm");
			} else {
				history2.time += format(history1[3], "yyyy年M月d日（") + DAY_OF_WEEK[HISTORY_DATE_TIME.getDay()] + "） 時刻不明";
			}

			const HISTORY_LIST_CHECKING_RESULT = historyList.findIndex((history) => history.id === history2.id);

			if (HISTORY_LIST_CHECKING_RESULT === -1) {
				historyList.push(history2);
			} else if (history2.type === "【新規追加】") {
				historyList[HISTORY_LIST_CHECKING_RESULT].type = "【新規追加】";
			}
		});

	return historyList;
}