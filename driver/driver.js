(function DriverClosure() {
  var stdout;
  var queryParams;

  window.load = function load() {
    stdout = document.getElementById("stdout");
    queryParams = getQueryParameters();
    // start working from another context to not let the browser load forever
    setTimeout(work, 0);
  };

  window.work = function work() {
    getTask(function(task) {
      processTask(task, function success(result) {
        log("Finished " + task._id +
            " (fileid: " + task.fileid + ") with result:");
        log(JSON.stringify(result, null, 2));
        work();
      }, function error() {
        log("Error processing " + task._id);
        work();
      })
    });
  }

  function getTask(callback) {
    makeRequest("task", function() {
      var response = this.responseText;
      var task = JSON.parse(response);
      callback(task);
    }, function() {
      log("Error getting task");
    })
  }

  function processTask(task, successCallback, errorCallback) {
    var taskRunner;
    switch(task.type) {
      case "benchmark":
        taskRunner = new BenchmarkTask(task, log, successCallback, errorCallback);
        break;
      default:
        errorCallback("Don't know how to handle this type of task");
    }
    taskRunner.run();
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

  function log(message) {
    stdout.innerHTML += message + "\n";
    if (message.lastIndexOf('\n') >= 0) {
      if ((stdout.scrollHeight - stdout.scrollTop) <= stdout.offsetHeight) {
        stdout.scrollTop = stdout.scrollHeight;
      }
    }
  }

  function makeRequest(target, callback, errorCallback) {
    var r = new XMLHttpRequest();
    r.onload = callback;
    r.onerror = errorCallback;
    r.open("GET", "../" + target);
    r.send();
  }
})();