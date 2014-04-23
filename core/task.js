module.exports.Task = function(type, fileid, tag, version, creationDate) {
  this.init(type, fileid, tag, version, creationDate);
};
var TaskPrototype = function() {
  this.init = function(type, fileid, tag, version, creationDate) {
    this.type = type;
    this.fileid = fileid;
    this.tag = tag;
    this.version = version;
    this.creationDate = creationDate;
    this.sentDate = null;
    this.completionDate = null;
    this.error = null;
    this.result = null;
  }
}
module.exports.Task.prototype = new TaskPrototype();