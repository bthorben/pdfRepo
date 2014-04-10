(function TaskRunnerClosure() {
  window.load = function load() {

    function receiveMessage(event) {
      window.task = event.data;

      processTask(task, function(error, result) {
        event.source.postMessage({
          "type": "finish",
          "error": error,
          "result": result,
        }, event.origin);
        window.close();
      });
    }

    var qparams = getQueryParameters();
    if (qparams.manualMode) {
      console.log("Working in manualMode");
      manualMode(qparams);
    } else {
      window.addEventListener("message", receiveMessage);
      window.opener.postMessage("ready", "*");
    }
  };

  function manualMode(qparams) {
    task = {
      fileid: qparams.file
    };
    taskRunner = new BenchmarkTask(task, function(error, result) {
      console.log("error: ", error);
      console.log("result: ", result);
    }, function(message) {
      console.log("report: ", message);
    }, qparams.page);
    taskRunner.run();
  }

  function report(message) {
    var reportMessage = {
      "type": "report",
      "message": message
    };
    if (window.opener) {
      window.opener.postMessage(reportMessage, "*");
    }
  }

  function processTask(task, callback) {
    var taskRunner;
    switch(task.type) {
      case "benchmark":
      case "calibration":
        taskRunner = new BenchmarkTask(task, callback, report);
        break;
      default:
        callback("Don't know how to handle this type of task");
    }
    try {
      taskRunner.run();
    } catch (err) {
      console.log("Error" + err);
      callback("Error in task: " + err);
    }
  }

  function getQueryParameters() {
    var qs = window.location.search.substring(1);
    var kvs = qs.split('&');
    var params = { };
    for (var i = 0; i < kvs.length; ++i) {
      var kv = kvs[i].split('=');
      params[unescape(kv[0])] = unescape(kv[1]);
    }
    return params;
  }
})();