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
      processTask(task, function success(error, result) {
        if (error) {
          log("Error processing " + task._id);
          //work();
        } else {
          log("Finished " + task._id +
              " (fileid: " + task.fileid + ") with result:");
          log(JSON.stringify(result, null, 2));
          log("Uploading result ...");
          postData("task/" + task._id + "/result", result, function(error) {
            if (error) {
              log("Error!");
            } else {
              log("Finished");
            }
            work();
          });
        }
      });
    });
  }

  function getTask(callback) {
    makeRequest("task", function(error, response) {
      if (error) {
        log("Error getting task, aborting");
      } else {
        if (response == "null") {
          // means: there are no more tasks available
          log("No more tasks to process");
        } else {
          var task = JSON.parse(response);
          callback(task);
        }
      }
    });
  }

  function processTask(task, callback) {
    var taskWindow = window.open("taskDriver.html", "_blank", "width=1000, height=1000");
    var received = false;
    function receiveMessage(event) {
      var response = event.data;
      if (typeof response == "string") {
        if (response == "ready") {
          taskWindow.postMessage(task, "*");
        } else {
          log(response);
        }
      } else {
        callback(response.error, response.result);
        window.removeEventListener("message", receiveMessage);
      }
    }
    window.addEventListener("message", receiveMessage);
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
    stdout.innerHTML = stdout.innerHTML.slice(-10000);
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