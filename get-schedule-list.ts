import { format, add, compareAsc } from "date-fns";

const START_UNIX_TIME = 1714143600000;
const END_UNIX_TIME = 1714230000000;
const START_DATE_TIME = new Date(START_UNIX_TIME);
const DATE_LINE = add(new Date(START_DATE_TIME.getFullYear(), START_DATE_TIME.getMonth(), START_DATE_TIME.getDate()), { days: 1 });
const DAY_OF_WEEK = ["㈰", "㈪", "㈫", "㈬", "㈭", "㈮", "㈯"];

async function getScheduleList() {
	let allScheduleList = await fetch("https://sheets.googleapis.com/v4/spreadsheets/1PI0zvp4NE4iPvmMAEYYxpX1SWphZgWCznsGe0eUMck4/values/list?valueRenderOption=UNFORMATTED_VALUE&key=AIzaSyC_QzDcgnm60gDgK2oTZpnw4XkaqZM5hOQ", {
		method: "GET"
	}).then(response => {
		return response.json();
	}).then(json => {
		return json;
	});

	let dailyScheduleList = allScheduleList.values.filter(schedule => schedule[0] >= START_UNIX_TIME && schedule[0] <= END_UNIX_TIME);
	let dailyScheduleText = format(START_DATE_TIME, "yyyy年M月d日") + DAY_OF_WEEK[START_DATE_TIME.getDay()] + format(START_DATE_TIME, " H:mm") + "からの音MAD周辺配信スケジュール";

	dailyScheduleList.forEach(schedule => {
		let scheduleDateTime = new Date(schedule[0]);
		let scheduleTimeText;

		
		if (compareAsc(scheduleDateTime, DATE_LINE) < 0) {
			switch (schedule[1]) {
				case true:
					scheduleTimeText = format(scheduleDateTime, "H:mm～");
					break;
				case false:
					scheduleTimeText = "本日中";
			}
		} else {
			switch (schedule[1]) {
				case true:
					scheduleTimeText = Number(format(scheduleDateTime, "H")) + 24 + format(scheduleDateTime, ":mm～");
					break;
				case false:
					scheduleTimeText = "明日中";
			}
		}
		
		dailyScheduleText += "\n\n" + schedule[2] + "\n" + scheduleTimeText + " " + schedule[5];
	});

	console.log(dailyScheduleText);
}

getScheduleList();