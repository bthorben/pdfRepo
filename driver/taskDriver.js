(function TaskRunnerClosure() {
  window.load = function load() {

    function receiveMessage(event) {
      var task = event.data;
      //window.task = task;

      processTask(task, function(error, result) {
        event.source.postMessage({
          "error": error,
          "result": result,
        }, event.origin);
        window.close();
      });
    }

    window.addEventListener("message", receiveMessage);
    window.opener.postMessage("ready", "*");
  };

  function log(message) {
    if (window.opener) {
      window.opener.postMessage(message, "*");
    }
  }

  /*window.processTask = */
  function processTask(task, callback) {
    var taskRunner;
    switch(task.type) {
      case "benchmark":
        taskRunner = new BenchmarkTask(task, callback, log);
        break;
      default:
        callback("Don't know how to handle this type of task");
    }
    try {
      taskRunner.run();
    } catch (err) {
      callback("Error in task: " + err);
    }
  }
})();