module.exports.Task = function(type, fileid, creationDate, sentDate, result) {
  this.init(type, fileid, creationDate, sentDate, result);
};
var TaskPrototype = function() {
  this.init = function(type, fileid, creationDate, sentDate, result) {
    this.type = type;
    this.fileid = fileid;
    this.creationDate = creationDate;
    this.sentDate = sentDate;
    this.result = result;
  }
}
module.exports.Task.prototype = new TaskPrototype();