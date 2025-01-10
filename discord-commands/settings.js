import * as dotenv from "dotenv";
import mysql from "mysql";
import { SlashCommandBuilder, ChannelType, heading, unorderedList, userMention, roleMention } from "discord.js";
import outputLog from "../output-log.js";
import queryDatabase from "../query-database.js";
import Sender from "../sender.js";

dotenv.config();

const REPORT_TYPES = ["today", "tonight", "soon", "update"];

const REPORT_TYPE_NAMES = {
	today: "今日予定の配信（0時）",
	tonight: "今夜予定の配信（18時）",
	soon: "まもなく開始予定の配信",
	update: "音MAD周辺配信表の更新"
};

export const SettingsCommand = {
	data:
		new SlashCommandBuilder()
			.setName("settings").setDescription("botの設定をします。")
			.addSubcommandGroup(subcommandGroup =>
				subcommandGroup
					.setName("mentions").setDescription("自動通知のメンションに関する設定をします。")
					.addSubcommand(subcommand =>
						subcommand
							.setName("add").setDescription("自動通知のメンション対象を追加します。")
							.addMentionableOption(option => option.setName("target").setDescription("ユーザー／ロールを指定して下さい。").setRequired(true))
					)
					.addSubcommand(subcommand =>
						subcommand
							.setName("remove").setDescription("自動通知のメンション対象を削除します。")
							.addMentionableOption(option => option.setName("target").setDescription("ユーザー／ロールを指定して下さい。").setRequired(true))
					)
					.addSubcommand(subcommand => subcommand.setName("list").setDescription("自動通知のメンション対象の一覧を表示します。"))
			)
			.addSubcommandGroup(subcommandGroup =>
				subcommandGroup
					.setName("report-types").setDescription("各種自動通知の有効／無効に関する設定をします。")
					.addSubcommand(subcommand =>
						subcommand
							.setName("enable").setDescription("特定の種別の自動通知を有効にします。")
							.addStringOption(option => 
								option
									.setName("target").setDescription("自動通知の種別を指定して下さい。").setRequired(true)
									.addChoices(
										{ name: "今日予定の配信（0時）", value: "today" },
										{ name: "今夜予定の配信（18時）", value: "tonight" },
										{ name: "まもなく開始予定の配信", value: "soon" },
										{ name: "音MAD周辺配信表の更新", value: "update" }
									)
							)
					)
					.addSubcommand(subcommand =>
						subcommand
							.setName("disable").setDescription("特定の種別の自動通知を無効にします。")
							.addStringOption(option => 
								option
									.setName("target").setDescription("自動通知の種別を指定して下さい。").setRequired(true)
									.addChoices(
										{ name: "今日予定の配信（0時）", value: "today" },
										{ name: "今夜予定の配信（18時）", value: "tonight" },
										{ name: "まもなく開始予定の配信", value: "soon" },
										{ name: "音MAD周辺配信表の更新", value: "update" }
									)
							)
					)
					.addSubcommand(subcommand => subcommand.setName("list").setDescription("各種自動通知の有効／無効の状態を表示します。"))
			)
			.addSubcommandGroup(subcommandGroup =>
				subcommandGroup
					.setName("channel").setDescription("自動通知するテキストチャンネルに関する設定をします。")
					.addSubcommand(subcommand =>
						subcommand
							.setName("join").setDescription("自動通知するテキストチャンネルを登録します。")
							.addChannelOption(option => option.setName("channel").setDescription("テキストチャンネルを指定して下さい。").addChannelTypes(ChannelType.GuildText).setRequired(true))
					)
					.addSubcommand(subcommand => subcommand.setName("leave").setDescription("自動通知するテキストチャンネルの登録を解除します。"))
					.addSubcommand(subcommand => subcommand.setName("show").setDescription("自動通知するテキストチャンネルを表示します。"))
			)
			.addSubcommandGroup(subcommandGroup =>
				subcommandGroup
					.setName("empty-report").setDescription("配信が無い時の0時／18時の自動通知に関する設定をします。")
					.addSubcommand(subcommand => subcommand.setName("enable").setDescription("配信が無い時の0時／18時の自動通知を有効にします。"))
					.addSubcommand(subcommand => subcommand.setName("disable").setDescription("配信が無い時の0時／18時の自動通知を無効にします。"))
					.addSubcommand(subcommand => subcommand.setName("show").setDescription("配信が無い時の0時／18時の自動通知の有効／無効の状態を表示します。"))
			),
	execute:
		async function (interaction) {
			const SERVER_ID = interaction.guildId;

			const MYSQL_CONNECTION = mysql.createConnection({
				host: process.env.MYSQL_HOST,
				user: process.env.MYSQL_USER,
				password: process.env.MYSQL_PASSWORD,
				database: process.env.MYSQL_DATABASE,
				supportBigNumbers: true,
				bigNumberStrings: true,
			});

			MYSQL_CONNECTION.connect((error) => {
				if (error) {
					outputLog(error, "error");
					return;
				} else {
					outputLog("データベースに接続しました。");
				}
			});

			switch (interaction.options.getSubcommandGroup()) {
				case "mentions":
					switch (interaction.options.getSubcommand()) {
						case "add":
							queryDatabase(MYSQL_CONNECTION, `SELECT mentions FROM discord_servers WHERE server_id=${SERVER_ID};`, (results) => {
									const TARGET_ID = interaction.options.getMentionable("target").id;
									let mentions = JSON.parse(results[0]["mentions"]);

									if (interaction.options.getUser("target")) {
										if (mentions.users.includes(TARGET_ID)) {
											const SENDER = new Sender({ plain: `自動通知のメンション対象ユーザーに <@${TARGET_ID}> は既に登録されています。` }, []);
											SENDER.setDiscordOption();
											SENDER.replyToDiscord(interaction, true);
											MYSQL_CONNECTION.end();
										} else {
											mentions.users.push(TARGET_ID);

											queryDatabase(MYSQL_CONNECTION, `UPDATE discord_servers SET mentions='${JSON.stringify(mentions)}' WHERE server_id=${SERVER_ID};`, () => {
												const SENDER = new Sender({ plain: `自動通知のメンション対象ユーザーに <@${TARGET_ID}> を追加しました。` }, []);
												SENDER.setDiscordOption();
												SENDER.replyToDiscord(interaction);
											}, true, true);
										}
									} else if (interaction.options.getRole("target")) {
										if (TARGET_ID === interaction.guild.roles.everyone.id) {
											switch (mentions.everyone) {
												case true:
													const SENDER = new Sender({ plain: "自動通知のメンション対象ロールに @everyone は既に登録されています。" }, []);
													SENDER.setDiscordOption();
													SENDER.replyToDiscord(interaction, true);
													MYSQL_CONNECTION.end();
													break;
												default:
													mentions.everyone = true;

													queryDatabase(MYSQL_CONNECTION, `UPDATE discord_servers SET mentions='${JSON.stringify(mentions)}' WHERE server_id=${SERVER_ID};`, () => {
														const SENDER = new Sender({ plain: `自動通知のメンション対象ロールに @everyone を追加しました。` }, []);
														SENDER.setDiscordOption();
														SENDER.replyToDiscord(interaction);
													}, true, true);
													
													break;
											}
										} else if (mentions.roles.includes(TARGET_ID)) {
											const SENDER = new Sender({ plain: `自動通知のメンション対象ロールに <@&${TARGET_ID}> は既に登録されています。` }, []);
											SENDER.setDiscordOption();
											SENDER.replyToDiscord(interaction, true);
											MYSQL_CONNECTION.end();
										} else {
											mentions.roles.push(TARGET_ID);

											queryDatabase(MYSQL_CONNECTION, `UPDATE discord_servers SET mentions='${JSON.stringify(mentions)}' WHERE server_id=${SERVER_ID};`, () => {
												const SENDER = new Sender({ plain: `自動通知のメンション対象ロールに <@&${TARGET_ID}> を追加しました。` }, []);
												SENDER.setDiscordOption();
												SENDER.replyToDiscord(interaction);
											}, true, true);
										}
									}
							}, false, true);

							break;

						case "remove":
							queryDatabase(MYSQL_CONNECTION, `SELECT mentions FROM discord_servers WHERE server_id=${SERVER_ID};`, (results) => {
									const TARGET_ID = interaction.options.getMentionable("target").id;
									let mentions = JSON.parse(results[0]["mentions"]);

									if (interaction.options.getUser("target")) {
										if (mentions.users.includes(TARGET_ID)) {
											mentions.users.splice(mentions.users.findIndex((userId) => { userId === TARGET_ID }), 1);

											queryDatabase(MYSQL_CONNECTION, `UPDATE discord_servers SET mentions='${JSON.stringify(mentions)}' WHERE server_id=${SERVER_ID};`, () => {
												const SENDER = new Sender({ plain: `自動通知のメンション対象ユーザーから <@${TARGET_ID}> を削除しました。` }, []);
												SENDER.setDiscordOption();
												SENDER.replyToDiscord(interaction);
											}, true, true);
										} else {
											const SENDER = new Sender({ plain: `自動通知のメンション対象ユーザーに <@${TARGET_ID}> は登録されていません。` }, []);
											SENDER.setDiscordOption();
											SENDER.replyToDiscord(interaction, true);
											MYSQL_CONNECTION.end();
										}
									} else if (interaction.options.getRole("target")) {
										if (TARGET_ID === interaction.guild.roles.everyone.id) {
											switch (mentions.everyone) {
												case true:
													mentions.everyone = false;

													queryDatabase(MYSQL_CONNECTION, `UPDATE discord_servers SET mentions='${JSON.stringify(mentions)}' WHERE server_id=${SERVER_ID};`, () => {
														const SENDER = new Sender({ plain: `自動通知のメンション対象ロールから @everyone を削除しました。` }, []);
														SENDER.setDiscordOption();
														SENDER.replyToDiscord(interaction);
													}, true, true);
													
													break;
												default:
													const SENDER = new Sender({ plain: "自動通知のメンション対象ロールに @everyone は登録されていません。" }, []);
													SENDER.setDiscordOption();
													SENDER.replyToDiscord(interaction, true);
													MYSQL_CONNECTION.end();
													break;
											}
										} else if (mentions.roles.includes(TARGET_ID)) {
											mentions.roles.splice(mentions.roles.findIndex((roleId) => { roleId === TARGET_ID }), 1);

											queryDatabase(MYSQL_CONNECTION, `UPDATE discord_servers SET mentions='${JSON.stringify(mentions)}' WHERE server_id=${SERVER_ID};`, () => {
												const SENDER = new Sender({ plain: `自動通知のメンション対象ロールから <@&${TARGET_ID}> を削除しました。` }, []);
												SENDER.setDiscordOption();
												SENDER.replyToDiscord(interaction);
											}, true, true);
										} else {
											const SENDER = new Sender({ plain: `自動通知のメンション対象ロールに <@&${TARGET_ID}> は登録されていません。` }, []);
											SENDER.setDiscordOption();
											SENDER.replyToDiscord(interaction, true);
											MYSQL_CONNECTION.end();
										}
									}
							}, false, true);

							break;

						case "list":
							queryDatabase(MYSQL_CONNECTION, `SELECT mentions FROM discord_servers WHERE server_id=${SERVER_ID};`, (results) => {
									let mentions = JSON.parse(results[0]["mentions"]);
									let preface = { plain: "" };

									if (mentions.users.length === 0 && mentions.roles.length === 0 && !mentions.everyone) {
										preface.plain = "自動通知のメンション対象は登録されていません。";
									} else {
										preface.plain += "自動通知のメンション対象は次の通りです。";

										if (mentions.users.length > 0) {
											preface.plain += "\n" + heading("ユーザー", 2) + "\n";
											let userMentions = new Array();
											mentions.users.forEach((user) => { userMentions.push(userMention(user)) });
											preface.plain += unorderedList(userMentions);
										}

										if (mentions.everyone || mentions.roles.length > 0) {
											preface.plain += "\n" + heading("ロール", 2) + "\n";
											let roleMentions = new Array();
											if (mentions.everyone) roleMentions.push("@everyone");
											mentions.roles.forEach((role) => { roleMentions.push(roleMention(role)) });
											preface.plain += unorderedList(roleMentions);
										}
									}

									const SENDER = new Sender(preface, []);
									SENDER.setDiscordOption();
									SENDER.replyToDiscord(interaction, true);
							}, true, true);

							break;
					}
					
					break;

				case "report-types":
					switch (interaction.options.getSubcommand()) {
						case "enable":
							queryDatabase(MYSQL_CONNECTION, `SELECT report_types FROM discord_servers WHERE server_id=${SERVER_ID};`, (results) => {
								const TARGET_TYPE = interaction.options.getString("target");
								let disabledReportTypes = JSON.parse(results[0]["report_types"]).disabled;

								if (disabledReportTypes.includes(TARGET_TYPE)) {
									disabledReportTypes.splice(disabledReportTypes.findIndex((type) => { type === TARGET_TYPE }), 1);

									queryDatabase(MYSQL_CONNECTION, `UPDATE discord_servers SET report_types='{ "disabled": ${JSON.stringify(disabledReportTypes)} }' WHERE server_id=${SERVER_ID};`, () => {
										const SENDER = new Sender({ plain: `${REPORT_TYPE_NAMES[TARGET_TYPE]}の自動通知を有効にしました。` }, []);
										SENDER.setDiscordOption();
										SENDER.replyToDiscord(interaction);
									}, true, true);
								} else {
									const SENDER = new Sender({ plain: `${REPORT_TYPE_NAMES[TARGET_TYPE]}の自動通知は既に有効です。` }, []);
									SENDER.setDiscordOption();
									SENDER.replyToDiscord(interaction);
									MYSQL_CONNECTION.end();
								}
							}, false, true);

							break;

						case "disable":
							queryDatabase(MYSQL_CONNECTION, `SELECT report_types FROM discord_servers WHERE server_id=${SERVER_ID};`, (results) => {
								const TARGET_TYPE = interaction.options.getString("target");
								let disabledReportTypes = JSON.parse(results[0]["report_types"]).disabled;

								if (disabledReportTypes.includes(TARGET_TYPE)) {
									const SENDER = new Sender({ plain: `${REPORT_TYPE_NAMES[TARGET_TYPE]}の自動通知は既に無効です。` }, []);
									SENDER.setDiscordOption();
									SENDER.replyToDiscord(interaction);
									MYSQL_CONNECTION.end();
								} else {
									disabledReportTypes.push(TARGET_TYPE);

									queryDatabase(MYSQL_CONNECTION, `UPDATE discord_servers SET report_types='{ "disabled": ${JSON.stringify(disabledReportTypes)} }' WHERE server_id=${SERVER_ID};`, () => {
										const SENDER = new Sender({ plain: `${REPORT_TYPE_NAMES[TARGET_TYPE]}の自動通知を無効にしました。` }, []);
										SENDER.setDiscordOption();
										SENDER.replyToDiscord(interaction);
									}, true, true);
								}
							}, false, true);

							break;

						case "list":
							queryDatabase(MYSQL_CONNECTION, `SELECT report_types FROM discord_servers WHERE server_id=${SERVER_ID};`, (results) => {
								let disabledReportTypes = JSON.parse(results[0]["report_types"]).disabled, reportTypesStatusText = new Array();
								REPORT_TYPES.forEach((type) => { reportTypesStatusText.push(`${REPORT_TYPE_NAMES[type]}：${disabledReportTypes.includes(type) ? "無効" : "有効"}`); });
								const SENDER = new Sender({ plain: `各種自動通知の有効／無効の状態は次の通りです。\n${unorderedList(reportTypesStatusText)}` }, []);
								SENDER.setDiscordOption();
								SENDER.replyToDiscord(interaction);
							}, true, true);

							break;
					}
					
					break;

				case "channel":
					switch (interaction.options.getSubcommand()) {
						case "join":
							const JOINING_CHANNEL_ID = interaction.options.getChannel("channel").id;

							queryDatabase(MYSQL_CONNECTION, `UPDATE discord_servers SET channel_id=${JOINING_CHANNEL_ID} WHERE server_id=${SERVER_ID};`, () => {
								const SENDER = new Sender({ plain: "自動通知するテキストチャンネルに <#" + JOINING_CHANNEL_ID + "> を登録しました。" }, []);
								SENDER.setDiscordOption();
								SENDER.replyToDiscord(interaction);
							}, true, true);

							break;

						case "leave":
							queryDatabase(MYSQL_CONNECTION, `UPDATE discord_servers SET channel_id=NULL WHERE server_id=${SERVER_ID};`, () => {
								const SENDER = new Sender({ plain: "自動通知するテキストチャンネルの登録を解除しました。" }, []);
								SENDER.setDiscordOption();
								SENDER.replyToDiscord(interaction);
							}, true, true);

							break;

						case "show":
							queryDatabase(MYSQL_CONNECTION, `SELECT channel_id FROM discord_servers WHERE server_id=${SERVER_ID};`, (results) => {
								const JOINED_CHANNEL_ID = results[0]["channel_id"];
								let preface = { plain: "" };

								if (JOINED_CHANNEL_ID) {
									preface.plain = `自動通知するテキストチャンネルは <#${JOINED_CHANNEL_ID}> です。`;
								} else {
									preface.plain = "自動通知するテキストチャンネルは登録されていません。";
								}

								const SENDER = new Sender(preface, []);
								SENDER.setDiscordOption();
								SENDER.replyToDiscord(interaction);
							}, true, true);

							break;
					}

				case "empty-report":
					switch (interaction.options.getSubcommand()) {
						case "enable":
							queryDatabase(MYSQL_CONNECTION, `UPDATE discord_servers SET empty_report=TRUE WHERE server_id=${SERVER_ID};`, () => {
								const SENDER = new Sender({ plain: "配信が無い時の0時／18時の自動通知を有効にしました。" }, []);
								SENDER.setDiscordOption();
								SENDER.replyToDiscord(interaction);
							}, true, true);

							break;

						case "disable":
							queryDatabase(MYSQL_CONNECTION, `UPDATE discord_servers SET empty_report=FALSE WHERE server_id=${SERVER_ID};`, () => {
								const SENDER = new Sender({ plain: "配信が無い時の0時／18時の自動通知を無効にしました。" }, []);
								SENDER.setDiscordOption();
								SENDER.replyToDiscord(interaction);
							}, true, true);

							break;

						case "show":
							queryDatabase(MYSQL_CONNECTION, `SELECT empty_report FROM discord_servers WHERE server_id=${SERVER_ID};`, (results) => {
								const SENDER = new Sender({ plain: `配信が無い時の0時／18時の自動通知は${ results[0]["empty_report"] ? "有効" : "無効" }です。` }, []);
								SENDER.setDiscordOption();
								SENDER.replyToDiscord(interaction);
							}, true, true);

							break;
					}
			}
		},
};