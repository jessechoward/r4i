require('dotenv');
const config = require('config');
const logger = require('./lib/logging');
const {Server} = require('net');
const Descriptor = require('./net/descriptor');
const Character = require('./lib/character');
const bcrypt = require('bcrypt');

const server = new Server({noDelay: true});
const readSet = new Set();

process.env['MUD_RUNNING'] = true;

server.once('close', () => {
	logger.notice('Server socket is no longer listening for connections');
});

server.once('listening', () => {
	logger.notice('Server socket is listening for new connections');
});

server.on('error', (error) => {
	logger.error('Server socket error', {error: error});
});

server.on('connection', (socket) => {
	const d = new Descriptor(socket);

	// Determine which game loop to use
	d.on('state', (oldState, newState) => {
		if (newState == 'playing') {
			d.on('line', () => {
				readSet.add(d);
			});
		}
		else if (newState == 'closing') {
			readSet.delete(d);
		}
		else {
			readSet.delete(d);
			loginOrCreate(d);
		}
	});

	d.once('close', () => {
		readSet.delete(d);
	});

	// send intro screen
	d.write('\r\nWelcome to the MUD!\r\n');

	d.state = 'get_name';
});

server.listen(config.get('server.listen'));

// small portion of the telnet option bytes
const TELNET = {
	IAC: 255,
	WILL: 251,
	WONT: 252,
	TELOPT_ECHO: 1
};

const echo_off_str = Buffer.from([TELNET.IAC, TELNET.WILL, TELNET.TELOPT_ECHO]);
const echo_on_str = Buffer.from([TELNET.IAC, TELNET.WONT, TELNET.TELOPT_ECHO]);

function loginOrCreate(d) {
	switch(d.state) {
	case 'get_name':
		logger.debug('loginOrCreate state "get_name"');
		d.question('\r\nWhat is your name? ', (answer) => {
			// TODO: lookup names to check for duplicates, incorrect formats etc.
			d.data.name = answer.trim();
			d.state = 'confirm_name';
		});
		break;
	case 'confirm_name':
		d.question(`\r\nHello ${d.data.name}!\r\nYou cannot change your name once you begin. Are you sure this is the name you want? `, (answer) => {
			if (['y', 'yes'].includes(answer.trim().toLowerCase())) {
				d.state = 'get_password';
			}
			else if (['n', 'no'].includes(answer.trim().toLowerCase())) {
				d.state = 'get_name';
			}
		});
		break;
	case 'get_password':
		d.write('\r\npassword:');
		d.write(echo_off_str);
		d.question(' ', (answer) => {
			d.write(echo_on_str);
			const pwd = answer.replace(/[^\x20-\x7E]/g, '');
			if (pwd.length < 6) {
				d.write('\r\nPassword mustbe at least 6 characters long.\r\n');
				d.state = 'get_password';
			}
			else {
				d.data.passwordHash = bcrypt.hashSync(pwd, 5);
				d.state = 'confirm_password';
			}
		});
		break;
	case 'confirm_password':
		d.write('\r\nConfirm password:');
		d.write(echo_off_str);
		d.question(' ', (answer) => {
			d.write(echo_on_str);
			const pwd = answer.replace(/[^\x20-\x7E]/g, '');
			if (!bcrypt.compareSync(pwd, d.data.passwordHash)) {
				d.write('\r\nPasswords do not match.\r\n');
				d.state = 'get_password';
			}
			else {
				// NOTE: since we sent telnet options a real terminal will ack
				// and we need to strip it in the next answer section
				d.state = 'get_race';
			}
		});
		break;
	case 'get_race':
		const races = ['human', 'elf', 'dwarf', 'half-elf', 'half-orc'];

		d.write('\r\nThe following are playable races:\r\n' + races.join('\r\n\t'));
		d.question('\r\nChoose your race from the above list: ', (answer) => {
			// strip real terminal ack leftover bytes from password tenet options
			const race = answer.trim().replace(/[^\x20-\x7E]/g, '');
			if (!races.includes(race.toLowerCase())) {
				d.write(`\r\n"${answer}" is not one of the available races. Try again. ${answer.charCodeAt(0)} ${answer.charCodeAt(1)}\r\n`);
				d.state = 'get_race';
			}
			else {
				d.data.race = race.toLowerCase();
				d.state = 'get_class';
			}
		});
		break;
	case 'get_class':
		const classes = ['warrior', 'barbarian', 'mage', 'thief', 'cleric'];
	
		d.write('\r\nThe following are playable classes:\r\n' + classes.join('\r\n\t'));
		d.question('\r\nChoose your class from the above list: ', (answer) => {
			if (!classes.includes(answer.trim().toLowerCase())) {
				d.write('\r\nThat is not one of the available classes. Try again.\r\n');
				d.state = 'get_class';
			}
			else {
				d.data.class = answer.trim().toLowerCase();
				d.ch = new Character(d);
				d.state = 'playing';
				d.ch.write('\r\nBe sure to reference the "help" command.\r\n');
			}
		});
		break;
	default:
		d.question('\r\nIn an unknown state.', (answer) => {
			d.write('\r\nGot into a bad state. Disconnect or be stuck in a loop.\r\n');
		});
	}
}

function playingLoop() {
	for (const d of readSet.values()) {
		if (!d.ch.handleInput()) {
			readSet.delete(d);
		}
	}
}

const playingInterval = setInterval(playingLoop, 200);

function onTick() {
	for (const ch of Character.characterSet.values()) {
		ch.write('\r\n*TICK*\r\n');
	}

	if (process.env.MUD_RUNNING) {
		tickTimeout = setTimeout(onTick, (Math.floor(Math.random() * (75 - 45 + 1) + 45)*1000));
	}
}

let tickTimeout = setTimeout(onTick, (Math.floor(Math.random() * (75 - 45 + 1) + 45)*1000));

function safeShutdown() {
	logger.notice('CTRL-C detected. Closing server');
	process.env['MUD_RUNNING'] = false;
	server.close();
	for (const d of Descriptor.descriptorMap.values()) {
		d.write('\r\nServer is shutting down now. Try back in a few mintes.\r\n');
		d.close();
	}
	clearTimeout(tickTimeout);
	clearInterval(playingInterval);
}

process.once('SIGINT', safeShutdown);
process.once('SIGUSR1', safeShutdown);