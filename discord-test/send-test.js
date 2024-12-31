// discord.jsライブラリの中から必要な設定を呼び出し、変数に保存します
import { Client, Events, GatewayIntentBits } from "discord.js";
import { format } from "date-fns";

// 設定ファイルからトークン情報を呼び出し、変数に保存します
import * as dotenv from "dotenv";
dotenv.config();
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

// クライアントインスタンスと呼ばれるオブジェクトを作成します
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// クライアントオブジェクトが準備OKとなったとき一度だけ実行されます
client.once(Events.ClientReady, c => {
	console.log(`準備OKです! ${c.user.tag}がログインします。`);

	try {
		client.channels.cache.get('929626706153705512').send('<@814521907831504968> <@999372283208552448> メッセージ');
	} catch (error) {
		console.log(format(Date.now(), "[yyyy-MM-dd HH:mm:ss]"));
		console.error(error);
	}
});

// ログインします
client.login(DISCORD_TOKEN);