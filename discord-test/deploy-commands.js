

// discord.js v14では、下記のようにRESTとRoutesはdiscord.jsパッケージから直接インポートできます
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v10";

// hey.jsのmodule.exportsを呼び出します。
import { heyFile } from "./hey.js";

// 環境変数としてapplicationId, guildId, tokenの3つが必要です
import * as dotenv from "dotenv";
dotenv.config();
const DISCORD_APPLICATION_ID = process.env.DISCORD_APPLICATION_ID;
const DISCORD_GUIDE_ID = process.env.DISCORD_GUIDE_ID;
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

// 登録コマンドを呼び出してリスト形式で登録
const commands = [heyFile.data.toJSON()];

// DiscordのAPIには現在最新のversion10を指定
const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);

// Discordサーバーにコマンドを登録
(async () => {
    try {
        await rest.put(
			Routes.applicationGuildCommands(DISCORD_APPLICATION_ID, DISCORD_GUIDE_ID),
			{ body: commands },
		);
        console.log('サーバー固有のコマンドが登録されました！');
    } catch (error) {
        console.error('コマンドの登録中にエラーが発生しました:', error);
    }
})();