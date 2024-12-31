// SlashCommandBuilder という部品を discord.js からインポートしています。
// これにより、スラッシュコマンドを簡単に構築できます。
import { SlashCommandBuilder } from "discord.js";
import { getScheduleList } from "../get-schedule-list.js";
import Sender from "../sender.js";
import { format } from "date-fns";

// 以下の形式にすることで、他のファイルでインポートして使用できるようになります。
export const heyFile = {
	data: new SlashCommandBuilder()
		.setName("list")
		.setDescription("音MAD周辺配信の予定を一覧で表示します。")
		.addNumberOption((option) => option.setName("startDate").setDescription("一覧表示の対象期間の開始日を数字8桁で指定します（例：20060304）。")),
	execute: async function (interaction) {
		const DAY_OF_WEEK = ["日", "月", "火", "水", "木", "金", "土"];
		const NOW = new Date("2024-12-28");
		const START_UNIX_TIME = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate(), NOW.getHours(), NOW.getMinutes(), 0).getTime();
		const PREFACE = { plain: format(NOW, "yyyy年M月d日（") + DAY_OF_WEEK[NOW.getDay()] + "）\n今日予定の音MAD周辺配信はこちら！" };
		const SCHEDULE_LIST = await getScheduleList(START_UNIX_TIME, START_UNIX_TIME + 108000000, false, true);
		const SENDER = new Sender(PREFACE, SCHEDULE_LIST);
		SENDER.setDiscordOption();
		SENDER.replyToDiscord(interaction);
	},
};

// module.exportsの補足
// キー・バリューの連想配列のような形で構成されています。
//
// module.exports = {
//    キー: バリュー,
//    キー: バリュー,
// };
//