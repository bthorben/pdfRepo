var assert = require("assert");
var Busboy = require("busboy");
var mongo = require("Mongodb");
var inspect = require("util").inspect;
var util = require('./util.js');

var Task = require("./task.js").Task;

var RESEND_TASKS_AFTER_S = 3600;


module.exports.getList = function getList(db, req, callback) {
  db.collection("tasks", function(err, collection) {
    var f = collection.find({}, {
      type: 1, fileid: 1, creationDate: 1, result: 1, _id:0
    });
    f.sort([["result", -1]]);
    f.toArray(callback);
  });
}

module.exports.getCount = function getCount(db, req, callback) {
  db.collection("tasks", function(err, collection) {
    collection.count(callback);
  });
}

module.exports.getTask = function getTask(db, req, callback) {
  db.collection("tasks", function(err, collection) {
    var currentTime = Date.now() / 1000 | 0;
    var okayToResend = currentTime - RESEND_TASKS_AFTER_S;
    collection.findOne({
      "result": null,
      $or: [
          { "sentDate": { $lt: okayToResend } },
          { "sentDate": null }
      ]
    }, function(err, task) {
      if (!task) {
        callback("no task found");
        return;
      }
      collection.update({ _id: task._id },
                        { $set: { sentDate: currentTime }},
                        { w: 1 }, function(err, result) {
        if (err || result != 1) {
          console.log("Error while updating result of task");
          console.log("result", result);
          console.log("error", err);
          res.send(200, "An error has occurred while getting Task");
        } else {
          console.log("Sent Task " + task._id +
                      " (fileid: " + task.fileid + ") to a client");
          callback(null, task);
        }
      });
    });
  });
}

module.exports.getResults = function getTask(db, type, callback) {
  db.collection("tasks", function(err, collection) {
    var f = collection.find({
      "result": { $ne: null },
      "type": type
    }, { result: 1, _id: 0 });
    f.toArray(callback);
  });
}

module.exports.addResult = function addResult(db, req, res) {
  var taskid = new mongo.ObjectID(req.params.taskid);
  db.collection("tasks", function(err, collection) {
    // TODO: resend tasks that have been send already an hour ago
    collection.findOne({ "_id": taskid }, function(err, task) {
      if (!task) {
        console.log("Task not found");
        res.send(404, "No such task");
        return;
      }
      var result = req.body;
      collection.update({ "_id": task._id },
                        { $set: { "result": result }},
                        { w: 1 }, function(err, result) {
        if (err || result != 1) {
          console.log("Error while updating result of task");
          console.log("result", result);
          console.log("error", err);
          res.send(200, "An error has occurred while saving results");
        } else {
          console.log("Saved Result of task " + task._id +
                      " (fileid: " + task.fileid + ")");
          res.send("Success");
        }
      });
    });
  });
}

module.exports.insertTaskForAllFiles = function insertTaskForAllFiles(db,
                                                                      req,
                                                                      res) {
  function getAllPdfs(callback) {
    db.collection("pdfs", function(err, pdfs) {
      var f = pdfs.find({}, { fileid: 1, url: 1, source: 1, _id:0 });
      f.toArray(function(err, items) {
        callback(items);
      });
    });
  }

  var taskType = req.body.type;
  if (!taskType) {
    res.send(200, "An error has occurred while inserting");
  }
  console.log("getting all pdfs ...");
  getAllPdfs(function(pdfs) {
    db.collection("tasks", function(err, tasks) {
      if (err) {
        res.send(200, "An error has occurred while inserting");
        return;
      }
      var currentSecond = Date.now() / 1000 | 0;
      for (var i = 0; i < pdfs.length; i++) {
        var p = pdfs[i];
        var t = new Task(taskType, p.fileid, currentSecond);
        tasks.insert(t, { w: 1, wtimeout: 30 }, function result(err, result){
          if (err) {
            res.send(200, "An error has occurred while inserting");
          } else {
            res.send("Success, tasks with type '" + taskType + "' inserted");
          }
        })
      };
    });
  });
}