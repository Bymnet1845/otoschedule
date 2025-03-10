import * as dotenv from "dotenv";
import { format } from "date-fns";
import cron from "node-cron";
import japaneseHolidays from "japanese-holidays";
import { Client, Events, GatewayIntentBits, ActivityType } from "discord.js";
import outputLog from "./output-log.js";
import connectDatabase from "./connect-database.js";
import queryDatabase from "./query-database.js";
import getScheduleList from "./get-schedule-list.js";
import getHistoryList from "./get-history-list.js";
import getAnnouncementList from "./get-announcement-list.js";
import Sender from "./sender.js";
import { SettingsCommand } from "./discord-commands/settings.js";
import { ListCommand } from "./discord-commands/list.js";
import { AboutCommand } from "./discord-commands/about.js";
import { SpreadsheetsCommand } from "./discord-commands/spreadsheets.js";

dotenv.config();

const DAY_OF_WEEK = ["日", "月", "火", "水", "木", "金", "土"];
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DISCORD_CLIENT = new Client({ intents: [GatewayIntentBits.Guilds] });
DISCORD_CLIENT.login(DISCORD_TOKEN);

DISCORD_CLIENT.on("ready", (event) => {
	outputLog(`${event.user.tag}としてDiscordにログインします。`);
	setDiscordAvtivity();
	const BOOT_MYSQL_CONNECTION = connectDatabase();
	const JOINING_DISCORD_SERVER_IDS = DISCORD_CLIENT.guilds.cache.map((guild) => guild.id);
	let registeredDiscordServerIds = new Array();

	queryDatabase(BOOT_MYSQL_CONNECTION, "SELECT * FROM discord_servers", (results) => {
		results.forEach((result) => {
			let serverId = result["server_id"];
			registeredDiscordServerIds.push(serverId);
			if (!JOINING_DISCORD_SERVER_IDS.includes(serverId)) deleteDiscordServer(serverId); 
		});

		JOINING_DISCORD_SERVER_IDS.forEach((serverId) => {
			if (!registeredDiscordServerIds.includes(serverId)) createDiscordServer(serverId, DISCORD_CLIENT.guilds.cache.get(serverId).systemChannelId);
		});
	});

	cron.schedule("0 0 0 * * *", () => { postPeriodicReports(0, 100800000, "今日", "today") });
	cron.schedule("0 0 18 * * *", () => { postPeriodicReports(18, 43200000, "今夜", "tonight") });

	cron.schedule("0 5,15,25,35,45,55 * * * *", async function () {
		setDiscordAvtivity();
		const NOW = new Date();
		const NOW_UNIX_TIME = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate(), NOW.getHours(), NOW.getMinutes(), 0).getTime();
		
		const PREFACE = {
			plain: "まもなく開始予定の音MAD周辺配信はこちら！",
			misskey: "まもなく開始予定の音MAD周辺配信はこちら！"
		};

		const SCHEDULE_LIST = await getScheduleList(NOW_UNIX_TIME + 600000, NOW_UNIX_TIME + 1199999);
		if (SCHEDULE_LIST.length > 0) postReports(PREFACE, SCHEDULE_LIST, "soon");
	});

	cron.schedule("0 10,30,50 * * * *", async () => {
		const NOW = new Date();
		const NOW_UNIX_TIME = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate(), NOW.getHours(), NOW.getMinutes(), 0).getTime();
		
		const PREFACE = {
			plain: "音MAD周辺配信表が更新されました！",
			misskey: "音MAD周辺配信表が更新されました！"
		};

		const HISTORY_LIST = await getHistoryList(NOW_UNIX_TIME - 1499999, NOW_UNIX_TIME - 300000);
		if (HISTORY_LIST.length > 0) postReports(PREFACE, HISTORY_LIST, "update");
	});

	cron.schedule("0 0 3,9,15,21 * * *", async () => {
		const MYSQL_CONNECTION = connectDatabase();
		const NOW = new Date();
		const NOW_UNIX_TIME = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate(), NOW.getHours(), 0, 0).getTime();
		const ANNOUNCEMENT_LIST = await getAnnouncementList(NOW_UNIX_TIME - 22199999, NOW_UNIX_TIME - 600000);

		if (ANNOUNCEMENT_LIST.length > 0) {
			ANNOUNCEMENT_LIST.forEach((announcement) => {
				const SENDER = new Sender({ plain: announcement.content.bluesky, misskey: announcement.content.misskey, discord: "# " + announcement.title + "\n" + announcement.content.discord }, []);
				if (announcement.content.bluesky) SENDER.sendToBluesky();
				if (announcement.content.misskey) SENDER.sendToMisskey();
				SENDER.setDiscordOption();

				if (announcement.content.discord) {
					queryDatabase(MYSQL_CONNECTION, "SELECT * FROM discord_servers", (results) => {
						for (let i = 0; i < results.length; i++) {
							const DISCORD_CHANNLEL_ID = results[i]["channel_id"] ? results[i]["channel_id"] : DISCORD_CLIENT.guilds.cache.get(results[i]["server_id"]).systemChannelId;
							SENDER.sendToDiscord(DISCORD_CLIENT, DISCORD_CHANNLEL_ID);
						}
					});
				}
			});
		}
	});
});

DISCORD_CLIENT.on(Events.InteractionCreate, async (interaction) => {
	if (!interaction.isChatInputCommand()) return;
	await interaction.deferReply();

	if (interaction.commandName === SettingsCommand.data.name) {
		try {
			const COMMAND_MYSQL_CONNECTION = connectDatabase();
			await SettingsCommand.execute(interaction, COMMAND_MYSQL_CONNECTION);
		} catch (error) {
			outputLog(error, "error");
			const SENDER = Sender({ discord: "コマンド実行時にエラーが発生しました。" });
			SENDER.setDiscordOption();
			SENDER.replyToDiscord(interaction, true);
		}
	} else if (interaction.commandName === ListCommand.data.name) {
		try {
			await ListCommand.execute(interaction);
		} catch (error) {
			outputLog(error, "error");
			const SENDER = Sender({ discord: "コマンド実行時にエラーが発生しました。" });
			SENDER.setDiscordOption();
			SENDER.replyToDiscord(interaction, true);
		}
	} else if (interaction.commandName === AboutCommand.data.name) {
		try {
			await AboutCommand.execute(interaction);
		} catch (error) {
			outputLog(error, "error");
			const SENDER = Sender({ discord: "コマンド実行時にエラーが発生しました。" });
			SENDER.setDiscordOption();
			SENDER.replyToDiscord(interaction, true);
		}
	} else if (interaction.commandName === SpreadsheetsCommand.data.name) {
		try {
			await SpreadsheetsCommand.execute(interaction);
		} catch (error) {
			outputLog(error, "error");
			const SENDER = Sender({ discord: "コマンド実行時にエラーが発生しました。" });
			SENDER.setDiscordOption();
			SENDER.replyToDiscord(interaction, true);
		}
	} else {
		outputLog(`${interaction.commandName}というコマンドは存在しません。`, "error");
		const SENDER = Sender({ discord: `${interaction.commandName}というコマンドは存在しません。` });
		SENDER.setDiscordOption();
		SENDER.replyToDiscord(interaction, true);
	}
});

DISCORD_CLIENT.on(Events.GuildCreate, (guild) => {
	createDiscordServer(guild.id, guild.systemChannelId);
});

DISCORD_CLIENT.on(Events.GuildDelete, (guild) => {
	deleteDiscordServer(guild.id);
});

process.on("uncaughtException", (error) => {
	outputLog(error, "error");
});

async function postPeriodicReports(nowHours, periodTime, prefacePeriodText, type) {
	const NOW = new Date();
	const START_UNIX_TIME = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate(), nowHours, 0, 0).getTime();
	const SCHEDULE_LIST = await getScheduleList(START_UNIX_TIME, START_UNIX_TIME + periodTime, false, true);
	let prefaceDayTextColor = "";

	if (japaneseHolidays.isHoliday(NOW) !== undefined || NOW.getDay() === 0) {
		prefaceDayTextColor = "FF0000";
	} else if (NOW.getDay() === 6) {
		prefaceDayTextColor = "0000FF";
	}

	const PREFACE = {
		plain: format(NOW, "yyyy年M月d日（") + DAY_OF_WEEK[NOW.getDay()] + "）\n" + prefacePeriodText + "予定の音MAD周辺配信は",
		misskey: format(NOW, "yyyy年M月d日（") + (prefaceDayTextColor ? "$[fg.color=" + prefaceDayTextColor + " " : "") + DAY_OF_WEEK[NOW.getDay()] + (prefaceDayTextColor ? "]" : "") + "）\n" + prefacePeriodText + "予定の音MAD周辺配信は"
	};

	if (SCHEDULE_LIST.length > 0) {
		PREFACE.plain += "こちら！";
		PREFACE.misskey += "こちら！";
	} else {
		PREFACE.plain += "見つかりませんでした。";
		PREFACE.misskey += "見つかりませんでした。";
	}

	postReports(PREFACE, SCHEDULE_LIST, type);
}

function postReports(preface, scheduleList, type) {
	const MYSQL_CONNECTION = connectDatabase();
	const SENDER = new Sender(preface, scheduleList);

	if (scheduleList.length > 0) {
		SENDER.sendToMisskey();
		SENDER.sendToBluesky();
	}

	queryDatabase(MYSQL_CONNECTION, "SELECT * FROM discord_servers", (results) => {
		for (let i = 0; i < results.length; i++) {
			if (results[i]["channel_id"] && !JSON.parse(results[i]["report_types"]).disabled.includes(type) && (scheduleList.length > 0 || JSON.parse(results[i]["empty_report"]))) {
				SENDER.setDiscordOption(JSON.parse(results[i]["mentions"]));
				SENDER.sendToDiscord(DISCORD_CLIENT, results[i]["channel_id"]);
			}
		}
	});
}

function setDiscordAvtivity() {
	try {
		DISCORD_CLIENT.user.setActivity({ name: `稼働中（参加サーバー数：${DISCORD_CLIENT.guilds.cache.size}）`, type: ActivityType.Custom });
	} catch (error) {
		outputLog(error, "error");
	}
}

function createDiscordServer(serverId, serverSystemChannelId) {
	const MYSQL_CONNECTION = connectDatabase();
	queryDatabase(MYSQL_CONNECTION, `INSERT INTO discord_servers (server_id, channel_id, mentions, report_types, empty_report) VALUES (${serverId}, NULL, '{ \"users\": [], \"roles\": [], \"everyone\": false }', '{ \"disabled\": [] }', FALSE);`, async () => {
		outputLog(`サーバー（ID：${serverId}）に参加しました。`);
		const SENDER = new Sender({ discord: "# Discord向け 音MAD周辺配信通知bot\nサーバーに追加して下さりありがとうございます！\n「音MAD周辺配信通知bot」は、音MAD周りの生放送配信の情報を集めた「音MAD周辺配信表」の情報を自動で通知するbotです。\n## 初期設定\n本botでは、ユーザーが登録したテキストチャンネルに「自動通知」をします。\nまずは、`/settings channel join`コマンドでテキストチャンネルを登録して下さい。\n## 主な機能\n- 今日／今夜予定の配信（0時／18時）、まもなく開始予定の配信、音MAD周辺配信表の更新といった情報を自動通知します。\n- `/list`系コマンドで指定された期間の配信の一覧を表示します。\n- `/spreadsheets`コマンドで本家スプレッドシート「音MAD周辺配信表」へのリンクを表示します。\n## カスタマイズ\n- `/settings report-types disable`：種別別に自動通知を無効にします。\n- `/settings empty-report enable`：通知出来る配信が無い時にも、0時／18時の自動通知を有効にします。\n- `/settings mentions add`：自動通知でメンションさせるユーザー／ロールを登録します。\n## 利用上の注意\n本bot及びその情報元である「音MAD周辺配信表」は、第三者が手動で勝手にまとめている物である為、把握していない配信があったり、急な予定変更が反映されていなかったりする場合があります。予め、ご了承下さい。" }, []);		 
		SENDER.setDiscordOption();
		SENDER.sendToDiscord(DISCORD_CLIENT, serverSystemChannelId);

		const NOW = new Date();
		const NOW_UNIX_TIME = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate(), NOW.getHours(), 0, 0).getTime();
		const ANNOUNCEMENT_LIST = await getAnnouncementList(NOW_UNIX_TIME);
	
		if (ANNOUNCEMENT_LIST.length > 0) {
			ANNOUNCEMENT_LIST.forEach((announcement) => {
				const ANNOUNCEMENT_SENDER = new Sender({ discord: "# " + announcement.title + "\n" + announcement.content.discord }, []);
				ANNOUNCEMENT_SENDER.setDiscordOption();
				ANNOUNCEMENT_SENDER.sendToDiscord(DISCORD_CLIENT, serverSystemChannelId);
			});
		}
	});
}

function deleteDiscordServer(serverId) {
	const MYSQL_CONNECTION = connectDatabase();
	queryDatabase(MYSQL_CONNECTION, `DELETE FROM discord_servers WHERE server_id=${serverId};`, () => {
		outputLog(`サーバー（ID：${serverId}）から退出しました。`);
	});
}