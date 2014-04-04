/**
 * Pad the fileid to be 24 bytes long, this matches the required
 * length for the mongodb ObjectID. Truncates to 24 chars if id is longer
 * than 24 characters
 *
 * @param  {any} id   the id to pad
 * @return {string}   the padded id
 */
module.exports.padObjectId = function(id) {
  return module.exports.padLeft(id, "0", 24)
}

/**
 * Pad the string with char to contain at least length characters. If string
 * is longer, it will be truncated
 */
module.exports.padLeft = function(string, char, length) {
  var padding = new Array(length).join(char);
  return (padding + string).slice(-length);
}