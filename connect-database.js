import * as dotenv from "dotenv";
import mysql from "mysql";
import outputLog from "./output-log.js";

dotenv.config();

export default function connectDatabase() {
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
	
	return MYSQL_CONNECTION;
}