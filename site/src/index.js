require('dotenv');
const config = require('config');
const express = require('express');
const morgan = require('morgan');

const app = express();

app.set('view engine', 'pug');
app.set('views', __dirname + '/views');

app.use(morgan('combined'));
app.use(express.json(), express.urlencoded({extended: true}));

app.use('/static', express.static(__dirname + '/static'));

app.use(require('./routes'));

const server = app.listen(config.get('app.port'), () => {
	console.log('Express web server started');
	server.once('close', () => {
		console.log('Express web server stopped');
	});
});

/**
 * Do any additional cleanup here before shutting down
 */
function safeShutdown() {
	console.log('Attempting safe shutdown');

	if (server && server.listening) {
		console.log('Stopping server');
		server.close();
	}
}

process.once('SIGINT', safeShutdown);
process.once('SIGUSR1', safeShutdown);

module.exports = server;