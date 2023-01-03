const app = require('../package.json');

module.exports = {
	app: {
		port: 8080,
		name: app.name,
		version: app.version
	}
};