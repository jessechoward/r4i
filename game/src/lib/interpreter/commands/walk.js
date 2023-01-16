/**
 * Walk in a direction
 * @param {Character} ch 
 * @param {InputString} input 
 */
module.exports = (ch, input) => {
	const direction = input.args[0];
	if (ch.in_room && ch.in_room.exits[direction]) {
		
	}
};