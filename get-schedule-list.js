import * as dotenv from "dotenv";
import { format } from "date-fns";

dotenv.config();
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
const DAY_OF_WEEK = ["日", "月", "火", "水", "木", "金", "土"];

export default async function getScheduleList(startUnixTime, endUnixTime, dateTextEnabled = true, twentyEightHoursSystemEnabled = false) {
	let scheduleList = new Array();
	let scheduleSheet = await fetch("https://sheets.googleapis.com/v4/spreadsheets/" + GOOGLE_SPREADSHEET_ID + "/values/list?valueRenderOption=UNFORMATTED_VALUE&key=" + GOOGLE_API_KEY, {
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
				service: schedule1[3],
				time: "",
				link: {
					url: schedule1[5],
					title: schedule1[4],
					hasTitle: schedule1[6]
				}
			};

			if (schedule1[1]) {
				const START_DATE_TIME = new Date(startUnixTime);
				const SCHEDULE_DATE_TIME = new Date(schedule1[0]);
				if (dateTextEnabled) schedule2.time += format(schedule1[0], "yyyy年M月d日（") + DAY_OF_WEEK[SCHEDULE_DATE_TIME.getDay()] + "） ";

				if (twentyEightHoursSystemEnabled) {
					schedule2.time += ("0" + (START_DATE_TIME.getDate() === SCHEDULE_DATE_TIME.getDate() ? SCHEDULE_DATE_TIME.getHours() : SCHEDULE_DATE_TIME.getHours() + 24)).slice(-2);
				} else {
					schedule2.time += format(schedule1[0], "HH");
				}
				
				schedule2.time += format(schedule1[0], ":mm");
				if (twentyEightHoursSystemEnabled && START_DATE_TIME.getDate() !== SCHEDULE_DATE_TIME.getDate()) schedule2.time += " (" + format(schedule1[0], "HH:mm") + ")";
			} else {
				if (dateTextEnabled) schedule2.time += format(schedule1[0], "yyyy-MM-dd ");
				schedule2.time += "時刻不明";
			}

			scheduleList.push(schedule2);
		});

	return scheduleList;
}