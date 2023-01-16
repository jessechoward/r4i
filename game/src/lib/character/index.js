const {EventEmitter} = require('events');
const logger = require('../logging');

const characterSet = new Set();

class Character extends EventEmitter {
	static get characterSet() {return characterSet;}

	constructor(descriptor) {
		super();
		this._descriptor = descriptor;
		characterSet.add(this);
		this._descriptor.on('close', () => {
			this._descriptor = null;
			characterSet.delete(this);
		});
	}

	get data() {return this.descriptor.data;}
	get descriptor() {return this._descriptor;}
	get name() {return this.data.name;}
	get race() {return this.data.race;}
	get class() {return this.data.class;}

	get sex() {return this.data.sex;}

	get position() {return this.data.position || 'standing';}
	set position(value) {
		if (value != this.position) {
			this.data.position = value;
			this.emit('position');
		}
	}

	get isAwake() {
		return ['sleeping', 'unconscious'].includes(this.position) ? false : true;
	}

	get canSee() {
		return this.isAwake;
	}

	handleInput() {
		const input = this.descriptor.readFromBuffer();

		if (input && input.startsWith('quit')) {
			this.write('\r\nQuitting the game. Thanks for playing!\r\n');
			this.descriptor.close();
		}
		else {
			this.write('Received: ' + input + '\r\n');
		}
	}

	write(data) {
		if (this.descriptor) {
			this.descriptor.write(data);
			// TODO: parse the prompt
			this.descriptor.prompt('<my prompt> ');
		}
	}

	save() {
		this.write('Game now has automatic periodic saving!\r\n');
	}

	quit() {
		this.save();
		this.write('\r\nThanks for playing! Come back again soon!\r\n');
		this.descriptor.close();
	}
}

module.exports = Character;