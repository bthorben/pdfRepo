(function TaskRunnerClosure() {
  window.load = function load() {

    function receiveMessage(event) {
      window.task = event.data;

      loadPdfjs(task.version, function() {
        processTask(task, function(error, result) {
          event.source.postMessage({
            "type": "finish",
            "error": error,
            "result": result,
          }, event.origin);
          window.close();
        });
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

  function loadPdfjs(versionPath, callback) {
    function addScript(url) {
      return new Promise(function(resolve, reject) {
        var s = document.createElement("script");
        s.src = "pdf.js/" + versionPath + "/" + url;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
    }

    Promise.all([
      addScript("src/shared/util.js"),
      addScript("src/shared/colorspace.js"),
      addScript("src/shared/function.js"),
      addScript("src/shared/annotation.js"),
      addScript("src/display/api.js"),
      addScript("src/display/metadata.js"),
      addScript("src/display/webgl.js"),
      addScript("src/display/canvas.js"),
      addScript("src/display/pattern_helper.js"),
      addScript("src/display/font_loader.js")
    ]).then(function() {
      window.PDFJS.disableWorker = true;
      window.PDFJS.cMapUrl = "pdf.js/" + versionPath + "/external/bcmaps/";
      window.PDFJS.cMapPacked = true;
      window.PDFJS.workerSrc = "pdf.js/" + versionPath + "/src/worker_loader.js";
      callback();
    });
  }

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