import * as dotenv from "dotenv";
import { SlashCommandBuilder, unorderedList } from "discord.js";
import Sender from "../sender.js";
import outputLog from "../output-log.js";

dotenv.config();

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

export const SpreadsheetsCommand = {
	data: new SlashCommandBuilder().setName("spreadsheets").setDescription("本家「音MAD周辺配信表」へのリンクを表示します。"),
	execute:
		async function (interaction) {
			let spreadsheetList = new Array;

			let spreadsheetsSheet = await fetch("https://sheets.googleapis.com/v4/spreadsheets/1PI0zvp4NE4iPvmMAEYYxpX1SWphZgWCznsGe0eUMck4/values/spreadsheets?valueRenderOption=UNFORMATTED_VALUE&key=" + GOOGLE_API_KEY, {
				method: "GET"
			}).then((response) => {
				return response.json();
			}).then((json) => {
				return json;
			}).catch((error) => {
				outputLog(error, "error");
			});

			spreadsheetsSheet.values.forEach((spreadsheet) => { spreadsheetList.push(`${spreadsheet[0]}：${spreadsheet[1]}`) });
			const SENDER = new Sender({ plain: "本家「音MAD周辺配信表」へのリンクは次の通りです。\n" + unorderedList(spreadsheetList) }, []);
			SENDER.setDiscordOption();
			SENDER.replyToDiscord(interaction);
		},
};