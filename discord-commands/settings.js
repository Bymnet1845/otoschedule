import * as dotenv from "dotenv";
import { format } from "date-fns";
import mysql from "mysql";
import { SlashCommandBuilder } from "discord.js";
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
							.addUserOption(option => option.setName("user").setDescription("ユーザーを追加します。").setRequired(true))
					)
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
					console.log(format(Date.now(), "[yyyy-MM-dd HH:mm:ss]"));
					console.error(error);
					return;
				} else {
					console.log(format(Date.now(), "[yyyy-MM-dd HH:mm:ss]"));
					console.log("データベースに接続しました。");
				}
			});

			switch (interaction.options.getSubcommandGroup()) {
				case "mentions":
					switch (interaction.options.getSubcommand()) {
						case "add-user":
							MYSQL_CONNECTION.query("SELECT mentions FROM discord_servers WHERE server_id=" + SERVER_ID + ";", (error, results) => {
								if (error) {
									console.log(format(Date.now(), "[yyyy-MM-dd HH:mm:ss]"));
									console.error(error);
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
												console.log(format(Date.now(), "[yyyy-MM-dd HH:mm:ss]"));
												console.error(error);
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
					}
			}
		},
};