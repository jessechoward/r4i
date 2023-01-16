const {EventEmitter} = require('events');
const {createInterface} = require('readline');
const logger = require('../lib/logging');

let topDescriptor = 0;
const freeDescriptors = [];
const descriptorMap = new Map();

class Descriptor extends EventEmitter {

	static get topDescriptor() {return topDescriptor;}
	static get descriptorMap() {return descriptorMap;}

	constructor(sock) {
		super();
		// sock.setDefaultEncoding('ascii');
		// sock.setEncoding('ascii');
		this._socket = sock;
		this._rl = createInterface({input: sock, output: sock, terminal: false, historySize: 0});
		this._id = freeDescriptors.shift() || ++topDescriptor;
		descriptorMap.set(this.id, this);
		this._inbuffer = [];
		this._data = {};
		this._idle = Date.now();

		this.socket.once('close', () => {
			logger.info(`Descriptor ${this.id} closing`);
			this._rl = null;
			this._socket = null;
			this._inbuffer.length = 0;
			descriptorMap.delete(this.id);
			freeDescriptors.push(this.id);
			this.emit('close');
		});

		this._rl.on('line', (line) => {
			if (line) {
				this._idle = Date.now();
				this._inbuffer.push(line.trim());
				this.emit('line');
				if (this._inbuffer.length >= 10) {
					this.write('Too much input too fast. Fix your client to rate limit input.\r\nCosing connection...\r\n');
					this.close();
					logger.warning('Descriptor inbuffer - line input exceeded 10', {descriptorId: this.id, ch: this.ch ? this.ch.name : '(null)'});
				}
			}
			else {
				logger.error('Descriptor readline on("line") produced a null line. Is this a bug in the readline library?');
			}
		});
	}

	get id() {return this._id;}
	get socket() {return this._socket;}
	get question() {return this._rl.question.bind(this._rl);}
	get data() {return this._data;}
	get idle() {return Math.floor((Date.now() - this._idle)*1000);}
	get state() {return this._state;}
	set state(newState) {
		const oldState = this._state || 'unknown';
		this._state = newState;
		this.emit('state', oldState, newState);
	}

	close() {
		logger.debug('Descriptor - requesting to close client socket');
		if (this.socket) {
			this.emit('closing');
			this.socket.destroy();
		}
	}

	/**
	 * Utilize the nodej Readline interface prompt and line setup to display a prompt.
	 * If there is input in the readline linebuffer, send it back to the client to act more like a real terminal.
	 *
	 * @param {string} prompt the fully formatted string to 
	 * @memberof Descriptor
	 */
	prompt(prompt) {
		this._rl.setPrompt(prompt);
		this._rl.prompt();
		// secret sauce: the readline interface buffers the line input for us
		// so if the user was typing then got some text, their typed text will
		// show up on their terminal so they can resume.
		// This is only to minimally support "telnet like" tcp connections.
		// We don't make any attempt to support additional tty/terminal functions like
		// history despite the nodejs readline interface having support for it. Leave this
		// to a client app to manage local history etc.
		if (this._rl.line.length > 0) this.socket.write(this._rl.line);
	}

	write(data) {
		if (this.socket) {
			try {
				this.socket.write(data);
			}
			catch(error) {				
				logger.warning('Descriptor write error', {error: error});
				this.close();
			}
		}
	}

	readFromBuffer() {
		return this._inbuffer.shift();
	}
}

module.exports = Descriptor;