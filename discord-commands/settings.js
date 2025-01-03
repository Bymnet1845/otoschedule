import * as dotenv from "dotenv";
import mysql from "mysql";
import { SlashCommandBuilder, ChannelType, heading, unorderedList, userMention, roleMention } from "discord.js";
import outputLog from "../output-log.js";
import Sender from "../sender.js";

dotenv.config();

export const SettingsCommand = {
	data:
		new SlashCommandBuilder()
			.setName("settings").setDescription("botの設定をします。")
			.addSubcommandGroup(subcommandGroup =>
				subcommandGroup
					.setName("mentions").setDescription("自動通知のメンションに関する設定をします。")
					.addSubcommand(subcommand =>
						subcommand
							.setName("add-user").setDescription("自動通知のメンション対象ユーザーを追加します。")
							.addUserOption(option => option.setName("user").setDescription("ユーザーを指定して下さい。").setRequired(true))
					)
					.addSubcommand(subcommand =>
						subcommand
							.setName("add-role").setDescription("自動通知のメンション対象ロールを追加します。")
							.addRoleOption(option => option.setName("role").setDescription("ロールを指定して下さい。").setRequired(true))
					)
					.addSubcommand(subcommand =>
						subcommand
							.setName("remove-user").setDescription("自動通知のメンション対象ユーザーを削除します。")
							.addUserOption(option => option.setName("user").setDescription("ユーザーを指定して下さい。").setRequired(true))
					)
					.addSubcommand(subcommand =>
						subcommand
							.setName("remove-role").setDescription("自動通知のメンション対象ロールを削除します。")
							.addRoleOption(option => option.setName("role").setDescription("ロールを指定して下さい。").setRequired(true))
					)
					.addSubcommand(subcommand => subcommand.setName("list").setDescription("自動通知のメンション対象の一覧を表示します。"))
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
						case "add-user":
							MYSQL_CONNECTION.query("SELECT mentions FROM discord_servers WHERE server_id=" + SERVER_ID + ";", (error, results) => {
								if (error) {
									outputLog(error, "error");
									MYSQL_CONNECTION.end();
									return;
								} else {
									const USER_ID = interaction.options.getUser("user").id;
									let data = JSON.parse(results[0]["mentions"]);

									if (data.users.includes(USER_ID)) {
										const SENDER = new Sender({ plain: "自動通知のメンション対象に <@" + USER_ID + "> は既に登録されています。" }, []);
										SENDER.setDiscordOption();
										SENDER.replyToDiscord(interaction);
										MYSQL_CONNECTION.end();
									} else {
										data.users.push(USER_ID);

										MYSQL_CONNECTION.query("UPDATE discord_servers SET mentions='" + JSON.stringify(data) + "' WHERE server_id=" + SERVER_ID + ";", (error, results) => {
											if (error) {
												outputLog(error, "error");
												MYSQL_CONNECTION.end();
												return;
											} else {
												const SENDER = new Sender({ plain: "自動通知のメンション対象に <@" + USER_ID + "> を追加しました。" }, []);
												SENDER.setDiscordOption();
												SENDER.replyToDiscord(interaction);
												MYSQL_CONNECTION.end();
											}
										});
									}
								}
							});

							break;

						case "add-role":
							MYSQL_CONNECTION.query("SELECT mentions FROM discord_servers WHERE server_id=" + SERVER_ID + ";", (error, results) => {
								if (error) {
									outputLog(error, "error");
									MYSQL_CONNECTION.end();
									return;
								} else {
									const ROLE_ID = interaction.options.getRole("role").id;
									let data = JSON.parse(results[0]["mentions"]);

									if (data.roles.includes(ROLE_ID)) {
										const SENDER = new Sender({ plain: "自動通知のメンション対象に <@&" + ROLE_ID + "> は既に登録されています。" }, []);
										SENDER.setDiscordOption();
										SENDER.replyToDiscord(interaction);
										MYSQL_CONNECTION.end();
									} else {
										data.roles.push(ROLE_ID);

										MYSQL_CONNECTION.query("UPDATE discord_servers SET mentions='" + JSON.stringify(data) + "' WHERE server_id=" + SERVER_ID + ";", (error, results) => {
											if (error) {
												outputLog(error, "error");
												MYSQL_CONNECTION.end();
												return;
											} else {
												const SENDER = new Sender({ plain: "自動通知のメンション対象に <@&" + ROLE_ID + "> を追加しました。" }, []);
												SENDER.setDiscordOption();
												SENDER.replyToDiscord(interaction);
												MYSQL_CONNECTION.end();
											}
										});
									}
								}
							});

							break;

						case "remove-user":
							MYSQL_CONNECTION.query("SELECT mentions FROM discord_servers WHERE server_id=" + SERVER_ID + ";", (error, results) => {
								if (error) {
									outputLog(error, "error");
									MYSQL_CONNECTION.end();
									return;
								} else {
									const USER_ID = interaction.options.getUser("user").id;
									let data = JSON.parse(results[0]["mentions"]);

									if (data.users.includes(USER_ID)) {
										data.users.splice(data.users.findIndex((user) => { user === USER_ID }), 1);

										MYSQL_CONNECTION.query("UPDATE discord_servers SET mentions='" + JSON.stringify(data) + "' WHERE server_id=" + SERVER_ID + ";", (error, results) => {
											if (error) {
												outputLog(error, "error");
												MYSQL_CONNECTION.end();
												return;
											} else {
												const SENDER = new Sender({ plain: "自動通知のメンション対象から <@" + USER_ID + "> を削除しました。" }, []);
												SENDER.setDiscordOption();
												SENDER.replyToDiscord(interaction);
												MYSQL_CONNECTION.end();
											}
										});
									} else {
										const SENDER = new Sender({ plain: "自動通知のメンション対象に <@" + USER_ID + "> は登録されていません。" }, []);
										SENDER.setDiscordOption();
										SENDER.replyToDiscord(interaction);
										MYSQL_CONNECTION.end();
									}
								}
							});

							break;

						case "remove-role":
							MYSQL_CONNECTION.query("SELECT mentions FROM discord_servers WHERE server_id=" + SERVER_ID + ";", (error, results) => {
								if (error) {
									outputLog(error, "error");
									MYSQL_CONNECTION.end();
									return;
								} else {
									const ROLE_ID = interaction.options.getRole("role").id;
									let data = JSON.parse(results[0]["mentions"]);

									if (data.roles.includes(ROLE_ID)) {
										data.roles.splice(data.roles.findIndex((role) => { role === ROLE_ID }), 1);

										MYSQL_CONNECTION.query("UPDATE discord_servers SET mentions='" + JSON.stringify(data) + "' WHERE server_id=" + SERVER_ID + ";", (error, results) => {
											if (error) {
												outputLog(error, "error");
												MYSQL_CONNECTION.end();
												return;
											} else {
												const SENDER = new Sender({ plain: "自動通知のメンション対象から <@&" + ROLE_ID + "> を削除しました。" }, []);
												SENDER.setDiscordOption();
												SENDER.replyToDiscord(interaction);
												MYSQL_CONNECTION.end();
											}
										});
									} else {
										const SENDER = new Sender({ plain: "自動通知のメンション対象に <@" + USER_ID + "> は登録されていません。" }, []);
										SENDER.setDiscordOption();
										SENDER.replyToDiscord(interaction);
										MYSQL_CONNECTION.end();
									}
								}
							});

							break;

						case "list":
							MYSQL_CONNECTION.query("SELECT mentions FROM discord_servers WHERE server_id=" + SERVER_ID + ";", (error, results) => {
								if (error) {
									outputLog(error, "error");
									MYSQL_CONNECTION.end();
									return;
								} else {
									let data = JSON.parse(results[0]["mentions"]);

									if (data) {
										let preface = { plain: "" };

										if (data.users.length === 0 && data.roles.length === 0) {
											preface.plain = "自動通知のメンション対象は登録されていません。";
										} else {
											preface.plain += "自動通知のメンション対象は次の通りです。";

											if (data.users.length > 0) {
												preface.plain += "\n" + heading("ユーザー", 2) + "\n";
												let userMentions = new Array();
												data.users.forEach((user) => { userMentions.push(userMention(user)) });
												preface.plain += unorderedList(userMentions);
											}

											if (data.roles.length > 0) {
												preface.plain += "\n" + heading("ロール", 2) + "\n";
												let roleMentions = new Array();
												data.roles.forEach((role) => { roleMentions.push(roleMention(role)) });
												preface.plain += unorderedList(roleMentions);
											}
										}

										const SENDER = new Sender(preface, []);
										SENDER.setDiscordOption();
										SENDER.replyToDiscord(interaction);
										MYSQL_CONNECTION.end();
									} else {
										const SENDER = new Sender({ plain: "自動通知のメンション対象は登録されていません。" }, []);
										SENDER.setDiscordOption();
										SENDER.replyToDiscord(interaction);
										MYSQL_CONNECTION.end();
									}
								}
							});

							break;
					}
					
					break;

				case "channel":
					switch (interaction.options.getSubcommand()) {
						case "join":
							const JOINING_CHANNEL_ID = interaction.options.getChannel("channel").id;

							MYSQL_CONNECTION.query("UPDATE discord_servers SET channel_id=" + JOINING_CHANNEL_ID + " WHERE server_id=" + SERVER_ID + ";", (error) => {
								if (error) {
									outputLog(error, "error");
									MYSQL_CONNECTION.end();
									return;
								} else {
									const SENDER = new Sender({ plain: "自動通知するテキストチャンネルに <#" + JOINING_CHANNEL_ID + "> を登録しました。" }, []);
									SENDER.setDiscordOption();
									SENDER.replyToDiscord(interaction);
									MYSQL_CONNECTION.end();
								}
							});

							break;

						case "leave":
							MYSQL_CONNECTION.query("UPDATE discord_servers SET channel_id=NULL WHERE server_id=" + SERVER_ID + ";", (error, results) => {
								if (error) {
									outputLog(error, "error");
									MYSQL_CONNECTION.end();
									return;
								} else {
									const SENDER = new Sender({ plain: "自動通知するテキストチャンネルの登録を解除しました。" }, []);
									SENDER.setDiscordOption();
									SENDER.replyToDiscord(interaction);
									MYSQL_CONNECTION.end();
								}
							});

							break;

						case "show":
							MYSQL_CONNECTION.query("SELECT channel_id FROM discord_servers WHERE server_id=" + SERVER_ID + ";", (error, results) => {
								if (error) {
									outputLog(error, "error");
									MYSQL_CONNECTION.end();
									return;
								} else {
									const JOINED_CHANNEL_ID = results[0]["channel_id"];

									if (JOINED_CHANNEL_ID) {	
										const SENDER = new Sender({ plain: "自動通知するテキストチャンネルは <#" + JOINED_CHANNEL_ID + "> です。" }, []);
										SENDER.setDiscordOption();
										SENDER.replyToDiscord(interaction);
										MYSQL_CONNECTION.end();
									} else {
										const SENDER = new Sender({ plain: "自動通知するテキストチャンネルは登録されていません。" }, []);
										SENDER.setDiscordOption();
										SENDER.replyToDiscord(interaction);
										MYSQL_CONNECTION.end();
									}
								}
							});

							break;
					}
			}
		},
};