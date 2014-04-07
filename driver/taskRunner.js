var TaskRunner = function(dbTask, log, successCallback, errorCallback) {
  this.init(dbTask, successCallback, errorCallback);
}
var TaskRunnerPrototype = function() {
  this.init = function(dbTask, log, successCallback, errorCallback) {
    this.dbTask = dbTask;
    this.log = log;
    this.successCallback = successCallback;
    this.errorCallback = errorCallback;
  }

  this.run = function() {
    this.errorCallback("Not implemented");
  }
}
TaskRunner.prototype = new TaskRunnerPrototype();