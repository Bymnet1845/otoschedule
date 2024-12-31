import * as dotenv from "dotenv";

dotenv.config();

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
let historyList = new Array();

export async function getHistoryList(startUnixTime, endUnixTime) {
	let historySheet = await fetch("https://sheets.googleapis.com/v4/spreadsheets/1PI0zvp4NE4iPvmMAEYYxpX1SWphZgWCznsGe0eUMck4/values/history?valueRenderOption=UNFORMATTED_VALUE&key=" + GOOGLE_API_KEY, {
		method: "GET"
	}).then((response) => {
		return response.json();
	}).then((json) => {
		return json;
	});

	historySheet.values
		.filter((history) => history[0] >= startUnixTime && history[0] <= endUnixTime)
		.sort((history1, history2) => history1[0] - history2[0])
		.forEach((history1) => {
			let history2 = {
				time: history1[0],
				schedule: history1[1],
				isOverwrite: history1[2]
			};

			historyList.push(history2);
		});

	return historyList;
}