(function DriverClosure() {

  var BETWEEN_MESSAGES_MAX_WAIT = 120000;
  var CALIBRATION_PDF = "calibration.pdf";

  var stdout;
  var queryParams;

  window.baseline = undefined;

  window.load = function load() {
    stdout = document.getElementById("stdout");
    // start working from another context to not let the browser load forever
    setTimeout(function () {
      work();
    }, 0);
  };

  window.work = function work() {
    getTask(function(task) {

      function handleTaskResult(error, result) {
        if (error) {
          log("Error processing " + task._id);
        } else {
          log("Finished " + task._id +
              " (fileid: " + task.fileid + ") with result:");
          result.baseline = window.baseline;
          log(JSON.stringify(result, null, 2));
          log("Uploading result ...");
        }
        var postDataObject = {
          "result": result,
          "error": error
        };
        postData("task/" + task._id + "/result", postDataObject, function(error) {
          if (error) {
            log("Error!");
          } else {
            log("Finished");
          }
          work();
        });
      }

      log("Processing " + task._id +
          " (fileid: " + task.fileid + ")");
      if (!window.baseline) {
        calibrate(function(newBaseline) {
          window.baseline = newBaseline;
          processTask(task, handleTaskResult);
        });
      } else {
        processTask(task, handleTaskResult);
      }
    });
  }

  function calibrate(callback) {
    var calibrationTask = {
      "file": CALIBRATION_PDF,
      "type": "calibration",
      "version": "baseline"
    }
    processTask(calibrationTask, function(error, result) {
      if (error) {
        log("Error calibrating, trying again in 60s ...");
        setTimeout(calibrate.bind(null, callback), 60000);
        return;
      }
      var times = result.timesPerPage, sum = 0, i;
      for (i = 0; i < times.length; i++) {
        sum += times[i];
      }
      var baseline = sum / times.length;
      log("Calibration finished. Baseline: " + baseline);
      callback(baseline);
    });
  }


  function getTask(callback) {
    makeRequest("task", function(error, task) {
      if (error) {
        log("Error getting task, trying again in 60s ...");
        setTimeout(getTask.bind(null, callback), 60000);
      } else {
        if (task == "null") {
          // means: there are no more tasks available
          log("No more tasks to process, trying again in 60s ...");
          setTimeout(getTask.bind(null, callback), 60000);
        } else {
          task = JSON.parse(task);
          callback(task);
        }
      }
    });
  }

  function processTask(task, callback) {
    var taskWindow = window.open("taskDriver.html", "_blank");
    var received = false;
    var processingTimeout;
    var atPage = 0;
    var atRun = 0;
    var totalPages = 0;

    resetTimeout();
    window.addEventListener("message", receiveMessage);

    function resetTimeout() {
      window.clearTimeout(processingTimeout);
      processingTimeout = window.setTimeout(handleResult.bind(null,
                                                              "Timeout",
                                                              null),
                                            BETWEEN_MESSAGES_MAX_WAIT);
    }

    function handleResult(error, result) {
      window.removeEventListener("message", receiveMessage);
      window.clearTimeout(processingTimeout);
      taskWindow.close();
      callback(error, result);
    }

    function handleReport(message) {
      var type = message.type;
      var value = message.value;
      switch(type) {
        case "totalPages":
          totalPages = value;
          break;
        case "page":
          log("Processing page " + value + " / " + totalPages);
          atPage = value;
          break;
        case "run":
          log("== Run " + value + " ==");
          atRun = value;
          break;
        case "error":
          log("Error: " + value);
      }
    }

    function receiveMessage(event) {
      if (event.source != taskWindow) {
        return;
      }
      resetTimeout();
      var response = event.data;
      if (typeof response == "string" && response == "ready") {
        taskWindow.postMessage(task, "*");
      } else {
        if (!response.type) {
          return
        }
        switch(response.type) {
          case "report":
            handleReport(response.message);
            break;
          case "finish":
            handleResult(response.error, response.result);
            break;
          }
      }
    }

  }

  function log(message) {
    stdout.value += message + "\n";
    stdout.value = stdout.value.slice(-10000);
    stdout.scrollTop = stdout.scrollHeight;
  }

  function makeRequest(target, callback) {
    var r = new XMLHttpRequest();
    var c = function(error) {
      var response = r.responseText;
      callback(error, response);
    }
    r.onload = c.bind(null, false);
    r.onerror = c.bind(null, true);

    r.open("GET", "../" + target);
    r.send();
  }

  function postData(target, object, callback) {
    var r = new XMLHttpRequest();
    var c = function(error) {
      var response = r.responseText;
      callback(error, response);
    }
    r.onload = c.bind(null, false);
    r.onerror = c.bind(null, true);

    r.open("POST", "../" + target);
    r.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    r.send(JSON.stringify(object));
  }
})();