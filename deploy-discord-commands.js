import * as dotenv from "dotenv";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v10";
import outputLog from "./output-log.js";
import { SettingsCommand } from "./discord-commands/settings.js";
import { AboutCommand } from "./discord-commands/about.js";

dotenv.config();
const DISCORD_APPLICATION_ID = process.env.DISCORD_APPLICATION_ID;
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const COMMANDS = [SettingsCommand.data.toJSON(), AboutCommand.data.toJSON()];
const DISCORD_REST = new REST({ version: "10" }).setToken(DISCORD_TOKEN);

(async function () {
    try {
        await DISCORD_REST.put(Routes.applicationCommands(DISCORD_APPLICATION_ID), { body: COMMANDS });
		outputLog("Discordのコマンドが登録されました。");
    } catch (error) {
		outputLog(error, "error");
    }
})();