import * as dotenv from "dotenv";
import { format } from "date-fns";

dotenv.config();

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
let scheduleList = new Array();

export async function getScheduleList(startUnixTime, endUnixTime) {
	let scheduleSheet = await fetch("https://sheets.googleapis.com/v4/spreadsheets/1PI0zvp4NE4iPvmMAEYYxpX1SWphZgWCznsGe0eUMck4/values/list?valueRenderOption=UNFORMATTED_VALUE&key=" + GOOGLE_API_KEY, {
		method: "GET"
	}).then((response) => {
		return response.json();
	}).then((json) => {
		return json;
	});

	scheduleSheet.values
		.filter((schedule) => schedule[0] >= startUnixTime && schedule[0] <= endUnixTime)
		.sort((schedule1, schedule2) => schedule1[0] - schedule2[0])
		.forEach((schedule1) => {
			let schedule2 = {
				title: schedule1[2],
				url: schedule1[5]
			};

			if (schedule1[1]) {
				schedule2.time = format(schedule1[0], "yyyy-MM-dd HH:mm");
			} else {
				schedule2.time = format(schedule1[0], "yyyy-MM-dd") + " 時刻不明";
			}

			scheduleList.push(schedule2);
		});

	return scheduleList;
}