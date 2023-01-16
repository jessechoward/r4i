const {createLogger, config, format, transports} = require('winston');
const app = require('../../../package.json');

const logger = createLogger({
	levels: config.syslog.levels,
	level: process.env.LOG_LEVEL || 'info',
	defaultMeta: {
		appName: app.name,
		appVersion: app.version
	},
	format: format.combine(
		format.timestamp(),
		format.json({space: 2, deterministic: true})
	),
	transports: [
		new transports.Console()
	]
});

module.exports = logger;