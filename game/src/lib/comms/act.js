const Character = require('../character');

/**
 * A core part of the game. Display
 *
 * @param {string} fmt Act Format strings <br>&nbsp;&nbsp;
 * - $S a format param <br>&nbsp;&nbsp;
 * - $s a format param <br>&nbsp;&nbsp;
 * - $M a format param <br>&nbsp;&nbsp;
 * - $m a format param <br>&nbsp;&nbsp;
 * - $P a format param <br>&nbsp;&nbsp;
 * - $p a format param <br>&nbsp;&nbsp;
 * @param {Object} options
 * @param {Character} options.ch - the subject
 * @param {'to_char'|'to_vict'|'to_room'|'to_not_vict'} options.type - how to handle the options
 * @param {string} options.minPos the minimum position a target must be in to get the message
 * @param {Character} [options.vch] the target/victim Character
 * @param {Item} [options.item1] the first object to be evaluated with $p
 * @param {Item} [options.item2] the second object to be evaluated with $P
 * 
 */
function act(fmt, options) {
	// noop
	console.log(fmt, options);
}

