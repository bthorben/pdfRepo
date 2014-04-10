module.exports.Task = function(type, fileid, tag, creationDate) {
  this.init(type, fileid, tag);
};
var TaskPrototype = function() {
  this.init = function(type, fileid, tag, creationDate) {
    this.type = type;
    this.fileid = fileid;
    this.tag = tag;
    this.creationDate = creationDate;
    this.sentDate = null;
    this.completionDate = null;
    this.error = null;
    this.result = null;
  }
}
module.exports.Task.prototype = new TaskPrototype();