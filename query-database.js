import outputLog from "./output-log.js";

export default function queryDatabase(connection, query, callback) {
	connection.query(query, (error, results, fields) => {
		if (error) {
			outputLog(error, "error");
			return;
		} else {
			callback(results, fields);
		}
	});
}