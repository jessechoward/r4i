const {readdirSync} = require('fs');
const {basename, extname, join} = require('path');

const commandPath = join(__dirname, 'commands');
const commandMap = new Map();

readdirSync(commandPath)
	.filter((filename) => {
		return extname(filename) == 'js';
	})
	.forEach((filename) => {
		commandMap.set(basename(filename, '.js'), require(join(commandPath, filename)));
	});

/**
 * Class representing a line of input with some convenience properties and functions.
 *
 * @class InputString
 */
class InputString {
	static firstArg(input) {
		// check for null or empty input 
		if (!input || input.trim().length == 0) return null;
	
		// default start at input[0]
		let start = 0;
		// default delimiter is a space
		let delim = ' ';
	
		// check if we start with a quote
		if (input[0] == '"' || input[0] == "'") {
			start = 1;
			delim = input[0];
		}
	
		// end will be the index of the delimiter or -1 if not found
		let end = input.indexOf(delim, start);
	
		return [
			// start to delim or rest if no delim found
			input.substring(start, end > 0 ? end : input.length).trim(),
			// index of delim + 1
			input.substring(end > 0 ? end+1 : input.length).trim()
		];
	}

	/**
	 * Creates an instance of InputString from line input
	 * @param {string} line a single line of input to be passed to a command interpreter
	 * @memberof InputString
	 */
	constructor(line) {
		this._line = line ? line.trim() : null;
		let parts = InputString.firstArg(line);
		this._cmd = parts ? parts[0] : null;
		this._originalArgs = parts ? parts[1] : null;
		this._remaining = this._originalArgs;
		this._args = [];
		while(parts) {
			parts = InputString.firstArg(parts[1]);
			if (parts) this._args.push(parts[0]);
		}
	}

	/**
	 * The original input line in its entirety
	 * @type {string}
	 * @readonly
	 * @memberof InputString
	 */
	get line() {return this._line;}
	/**
	 * The command/action/first argument of te input line
	 * @type {string|null}
	 * @readonly
	 * @memberof InputString
	 */
	get cmd() {return this._cmd;}
	/**
	 * The remaining line after calling nextArg() - null if no more args to parse
	 * @type {string|null}
	 * @readonly
	 * @memberof InputString
	 */
	get remaining() {return this._remaining;}
	/**
	 * An array of all of the parsed args. Potentially empty.
	 * @type {string[]}
	 * @readonly
	 * @memberof InputString
	 */
	get args() {return this._args;}

	/**
	 * Get the next argument from the "remainder" of the line.
	 * this.remaining will be reduced by the first argument and may be set to null.
	 * Caller of nextArg is responsible for keeping track via "this.remaining" property.
	 *
	 * @return {string|null} the next argument or null if nothing left to parse
	 * @memberof InputString
	 */
	nextArg() {
		const parts = InputString.firstArg(this.remaining);
		if (parts) {
			this._remaining = parts[1];
			return parts[0];
		}
	}
}

const isSpeedwalk = /^[neswud]+$/;

/**
 * Interpret input
 *
 * @param {Character} ch the Character to interpret the input as
 * @param {string} line the line of input from the Character to interpret
 * @return {void} 
 */
module.exports = (ch, line) => {
	
	if (isSpeedwalk.test(line)) {
		const input = InputString(`speedwalk ${line}`);
		return commandMap.get('speedwalk')(ch, input);
	}

	const input = new InputString(line);

	if (input.cmd && input.cmd.length > 0) {
		for (const [key, func] of commandMap.entries()) {
			if (key.startsWith(input.cmd)) {
				return func(ch, input);
			}
		}

		ch.write(`Unrecognized command ${input.cmd}.\r\n`);
	}
	else {
		ch.write('\r\n');
	}
};