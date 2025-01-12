import * as dotenv from "dotenv";
import { SlashCommandBuilder } from "discord.js";
import { format } from "date-fns";
import getScheduleList from "../get-schedule-list.js";
import Sender from "../sender.js";

const DAY_OF_WEEK = ["日", "月", "火", "水", "木", "金", "土"];
dotenv.config();

export const ListCommand = {
	data:
		new SlashCommandBuilder()
			.setName("list").setDescription("音MAD周辺配信表に掲載されている配信を表示します。")
			.addSubcommand(subcommand => subcommand.setName("today").setDescription("音MAD周辺配信表に掲載されている今日の配信を表示します。"))
			.addSubcommand(subcommand => subcommand.setName("tomorrow").setDescription("音MAD周辺配信表に掲載されている明日の配信を表示します。"))
			.addSubcommand(subcommand => subcommand.setName("week").setDescription("音MAD周辺配信表に掲載されている今後7日間の配信を表示します。"))
			.addSubcommand(subcommand => subcommand.setName("this-month").setDescription("音MAD周辺配信表に掲載されている今月の配信を表示します。"))
			.addSubcommand(subcommand => subcommand.setName("next-month").setDescription("音MAD周辺配信表に掲載されている来月の配信を表示します。")),
	execute:
		async function (interaction) {
			const NOW = new Date();
			let startDateTime, endDateTime;

			switch (interaction.options.getSubcommand()) {
				case "today":
					startDateTime = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate(), 0, 0, 0);
					endDateTime = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() + 1, 4, 0, 0); 
					break;
				case "tomorrow":
					startDateTime = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() + 1, 0, 0, 0);
					endDateTime = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() + 2, 4, 0, 0); 
					break;
				case "week":
					startDateTime = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate(), 0, 0, 0);
					endDateTime = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() + 7, 4, 0, 0); 
					break;
				case "this-month":
					startDateTime = new Date(NOW.getFullYear(), NOW.getMonth(), 1, 0, 0, 0);
					endDateTime = new Date(NOW.getFullYear(), NOW.getMonth() + 1, 1, 4, 0, 0); 
					break;
				case "next-month":
					startDateTime = new Date(NOW.getFullYear(), NOW.getMonth() + 1, 1, 0, 0, 0);
					endDateTime = new Date(NOW.getFullYear(), NOW.getMonth() + 2, 1, 4, 0, 0); 
					break;
			}
			
			let preface = { discord: `${format(startDateTime, "yyyy年M月d日")}（${DAY_OF_WEEK[startDateTime.getDay()]}）0時 ～ ${format(endDateTime, "yyyy年M月d日")}（${DAY_OF_WEEK[endDateTime.getDay()]}）4時` + "\n音MAD周辺配信表に掲載されている配信は" };
			const SCHEDULE_LIST = await getScheduleList(startDateTime.getTime(), endDateTime.getTime());

			if (SCHEDULE_LIST.length > 0) {
				preface.discord += "こちら！";
			} else {
				preface.discord += "ありませんでした。";
			}

			const SENDER = new Sender(preface, SCHEDULE_LIST);
			SENDER.setDiscordOption();
			SENDER.replyToDiscord(interaction);
		},
};