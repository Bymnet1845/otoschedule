import * as dotenv from "dotenv";
import { format } from "date-fns";
import cron from "node-cron";
import mysql from "mysql";
import japaneseHolidays from "japanese-holidays";
import { Client, Events, GatewayIntentBits, ActivityType, heading, unorderedList, inlineCode } from "discord.js";
import outputLog from "./output-log.js";
import queryDatabase from "./query-database.js";
import getScheduleList from "./get-schedule-list.js";
import getHistoryList from "./get-history-list.js";
import Sender from "./sender.js";
import { SettingsCommand } from "./discord-commands/settings.js";

dotenv.config();

const DAY_OF_WEEK = ["日", "月", "火", "水", "木", "金", "土"];
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DISCORD_CLIENT = new Client({ intents: [GatewayIntentBits.Guilds] });
DISCORD_CLIENT.login(DISCORD_TOKEN);

const MYSQL_CONNECTION = mysql.createConnection({
	host: process.env.MYSQL_HOST,
	user: process.env.MYSQL_USER,
	password: process.env.MYSQL_PASSWORD,
	database: process.env.MYSQL_DATABASE,
	supportBigNumbers: true,
	bigNumberStrings: true
});

MYSQL_CONNECTION.connect((error) => {
	if (error) {
		outputLog(error, "error");
		return;
	} else {
		outputLog("データベースに接続しました。");
	}
});

DISCORD_CLIENT.on("ready", (event) => {
	outputLog(`${event.user.tag}としてDiscordにログインします。`);
	setDiscordAvtivity();

	cron.schedule("0 0 0 * * *", () => {postPeriodicReports(0, 100800000, "今日", "today") });
	cron.schedule("0 0 18 * * *", () => { postPeriodicReports(18, 43200000, "今夜", "tonight") });

	cron.schedule("0 5,15,25,35,45,55 * * * *", async function () {
		setDiscordAvtivity();
		const NOW = new Date();
		const NOW_UNIX_TIME = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate(), NOW.getHours(), NOW.getMinutes(), 0).getTime();
		
		const PREFACE = {
			plain: "間も無く開始予定の音MAD周辺配信はこちら！",
			mfm: "間も無く開始予定の音MAD周辺配信はこちら！"
		};

		const SCHEDULE_LIST = await getScheduleList(NOW_UNIX_TIME + 300000, NOW_UNIX_TIME + 900000);
		if (SCHEDULE_LIST.length > 0) postReports(PREFACE, SCHEDULE_LIST, "soon");
	});

	cron.schedule("0 10,30,50 * * * *", async () => {
		const NOW = new Date();
		const NOW_UNIX_TIME = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate(), NOW.getHours(), NOW.getMinutes(), 0).getTime();
		
		const PREFACE = {
			plain: "音MAD周辺配信表が更新されました！",
			mfm: "音MAD周辺配信表が更新されました！"
		};

		const HISTORY_LIST = await getHistoryList(NOW_UNIX_TIME - 1499999, NOW_UNIX_TIME - 300000);
		if (HISTORY_LIST.length > 0) postReports(PREFACE, HISTORY_LIST, "update");
	});
});

DISCORD_CLIENT.on(Events.InteractionCreate, async (interaction) => {
	if (!interaction.isChatInputCommand()) return;

	if (interaction.commandName === SettingsCommand.data.name) {
		try {
			await SettingsCommand.execute(interaction);
		} catch (error) {
			outputLog(error, "error");

			if (interaction.replied || interaction.deferred) {
				await interaction.followUp({ content: "コマンド実行時にエラーが発生しました。", flags: MessageFlags.Ephemeral });
			} else {
				await interaction.reply({ content: "コマンド実行時にエラーが発生しました。", flags: MessageFlags.Ephemeral });
			}
		}
	} else {
		outputLog(`${interaction.commandName}というコマンドは存在しません。`, "error");
	}
});

DISCORD_CLIENT.on(Events.GuildCreate, (guild) => {
	queryDatabase(MYSQL_CONNECTION, `INSERT INTO discord_servers (server_id, channel_id, mentions, report_types) VALUES (${guild.id}, NULL, '{ \"users\": [], \"roles\": [] }', '{ \"disabled\": [] }');`, () => {
		outputLog(`サーバー（名称：${guild.name}、ID：${guild.id}）に参加しました。`);
		const SENDER = new Sender({ plain: heading("Discord向け 音MAD周辺配信通知bot", 1) + "\nサーバーに追加して下さり有難う御座います！\n" + heading("初期設定", 2) + "\n本botでは、設定されたテキストチャンネルに、「音MAD周辺配信表」の情報を自動通知します。\n設定コマンド（" + inlineCode("/settings channel join") + "）でテキストチャンネルを登録して下さい。\n" + heading("自動通知の種類", 2) + "\n" + unorderedList(["今日予定の音MAD周辺配信（0時）", "今夜予定の音MAD周辺配信（18時）", "まもなく開始予定の音MAD周辺配信（適時）", "音MAD周辺配信表の更新情報（適時）"]) + "\n各種通知の無効化は、設定コマンド（" + inlineCode("/settings disabled-report-types add") + "）で行えます。\n" + heading("自動通知のメンション機能", 2) + "\n自動通知で特定のユーザー／ロールにメンションする事が出来ます。\nメンション対象の追加は、設定コマンド（" + inlineCode("/settings mentions add-user") + "、" + inlineCode("/settings mentions add-role") + "）で行えます。\n" + heading("ヘルプ", 2) + "\nその他詳しい使い方は、ヘルプコマンド（" + inlineCode("/help") + "）から御覧下さい。\n" + heading("クレジット", 2) + "\nBased project by One O'Clock\nDeveloped and operated by Bymnet1845 (Minegumo Productions)" }, []);		 
		SENDER.setDiscordOption();
		SENDER.sendToDiscord(DISCORD_CLIENT, guild.systemChannelId);
	}, false, false);
});

DISCORD_CLIENT.on(Events.GuildDelete, (guild) => {
	queryDatabase(MYSQL_CONNECTION, `DELETE FROM discord_servers WHERE server_id=${guild.id};`, () => {
		outputLog(`サーバー（名称：${guild.name}、ID：${guild.id}）から退出しました。`);
	}, false, false);
});

async function postPeriodicReports(nowHours, periodTime, prefacePeriodText, type) {
	const NOW = new Date();
	const START_UNIX_TIME = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate(), nowHours, 0, 0).getTime();
	let prefaceDayTextColor = "";

	if (japaneseHolidays.isHoliday(NOW) !== undefined || NOW.getDay() === 0) {
		prefaceDayTextColor = "FF0000";
	} else if (NOW.getDay() === 6) {
		prefaceDayTextColor = "0000FF";
	}

	const PREFACE = {
		plain: format(NOW, "yyyy年M月d日（") + DAY_OF_WEEK[NOW.getDay()] + "）\n" + prefacePeriodText + "予定の音MAD周辺配信はこちら！",
		mfm: format(NOW, "yyyy年M月d日（") + (prefaceDayTextColor ? "$[fg.color=" + prefaceDayTextColor + " " : "") + DAY_OF_WEEK[NOW.getDay()] + (prefaceDayTextColor ? "]" : "") + "）\n" + prefacePeriodText + "予定の音MAD周辺配信はこちら！"
	};

	const SCHEDULE_LIST = await getScheduleList(START_UNIX_TIME, START_UNIX_TIME + periodTime, false, true);
	if (SCHEDULE_LIST.length > 0) postReports(PREFACE, SCHEDULE_LIST, type);
}

function postReports(preface, scheduleList, type) {
	const SENDER = new Sender(preface, scheduleList);
	SENDER.sendToMisskey();
	// SENDER.sendToBluesky();

	queryDatabase(MYSQL_CONNECTION, "SELECT * FROM discord_servers", (results) => {
		for (let i = 0; i < results.length; i++) {
			if (results[i]["channel_id"] && !JSON.parse(results[i]["report_types"]).disabled.includes(type)) {
				SENDER.setDiscordOption(JSON.parse(results[i]["mentions"]));
				SENDER.sendToDiscord(DISCORD_CLIENT, results[i]["channel_id"]);
			}
		}
	}, false, false);
}

function setDiscordAvtivity() {
	DISCORD_CLIENT.user.setActivity({ name: `稼働中（参加サーバー数：${DISCORD_CLIENT.guilds.cache.size}）`, type: ActivityType.Custom });
}