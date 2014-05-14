var http = require("http");
var fs = require("fs");
var express = require("express");
var request = require("request");
var spawn = require("child_process").spawn;
var express = require("express");
var WebBrowser = require("./util/webbrowser.js").WebBrowser;


var ASSUME_CRASH_AFTER_MS = 120 * 1000;

var currentTaskId;
// the started browser

var config = JSON.parse(fs.readFileSync("slave.config"));

function sendResult(taskId, taskResult, res, callback) {
  console.log("Sending result ..." + taskResult);
  request.post("http://" + hostnameOfServer + "/task/" + taskId + "/result",
    taskResult,
    function () {
      if (res) {
        res.send(200);
      }
      if (callback) {
        callback();
      }
    });
}

var browser = WebBrowser.create(config.browser);;
function startTaskBrowser() {
  var startUrl = "http://" + hostnameOfServer + "/driver/driver.html" +
                 "?host=" + encodeURIComponent("localhost:" + port);
  console.log(startUrl);
  browser.start(startUrl);
  resetCrashTimeout();
}

var crashTimeout;
function resetCrashTimeout() {
  clearTimeout(crashTimeout);
  crashTimeout = setTimeout(function() {
    console.log("Assuming crash, restarting ...");
    browser.cleanup();
    startTaskBrowser();
  }, ASSUME_CRASH_AFTER_MS);
}

function startServer() {
  var app = express();
  app.configure(function () {
    if (debug) {
      app.use(express.logger("dev"));
    }
    app.use(express.json());
    app.use(express.urlencoded());
  });

  app.use(function(req, res, next){
    res.header("Access-Control-Allow-Origin", req.headers.origin);
    res.header("Access-Control-Allow-Headers", "Content-Type");
    res.header("Access-Control-Allow-Methods", "GET, POST");
    next();
  });

  app.get("/task", function(req, res) {
    resetCrashTimeout();
    console.log("requesting http://" + hostnameOfServer + "/task");
    request("http://" + hostnameOfServer + "/task",
      function (error, response, task) {
        if (error) {
          console.log("Error" + error);
          res.send(500);
        } else {
          currentTaskId = task._id;
          console.log("Got task " + task);
          res.send(task);
        }
      });
  });
  app.post("/task/:taskid/result", function(req, res) {
    resetCrashTimeout();
    var taskid = req.params.taskid;
    var taskResult = req.body;
    sendResult(taskid, taskResult, res);
    res.send(200);
  });
  app.post("/log", function(req, res) {
    resetCrashTimeout();
    if (req.body.m) {
      console.log(req.body.m);
    }
    res.send(200);
  });
  app.listen(port);
}

var arguments = process.argv.slice(2);
if (arguments.length < 1) {
  console.log("Usage: repoHostname [port] [debug]")
  process.exit();
}
var hostnameOfServer = arguments[0];
var port = arguments[1] || 4000;
var debug = arguments[2] || false;

startServer();
startTaskBrowser();