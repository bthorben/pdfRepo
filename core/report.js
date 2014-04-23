var mongo = require("Mongodb");
var pdfs = require("./pdfs.js");
var Pdf = require("./pdf.js").Pdf;
var tasks = require("./tasks.js");
var Task = require("./task.js").Task;
var data = require("./data.js");

module.exports.getReportData = function getReport(db, versions, latestVersion,
                                                  callback) {
  var totalPages = 0;

  function createHistogramData(callback, result, i) {
    var result = result ? result : [];
    var i = i ? i : 0;
    tasks.getList(db, {
      "type": "benchmark", "result": { $ne: null}, "version": versions[i]
    }, function(err, tasks) {
      console.log("Processing " + versions[i]);
      var r = data.getHistogramData(tasks);
      result[i] = r;
      totalPages += r.totalPages;
      i++;
      if (i >= versions.length) {
        callback(result);
      } else {
        createHistogramData(callback, result, i);
      }
    });
  }

  function outputPage(pdfCount, crashedTasks, latestTasks) {
    var slowTasks = data.sortBySlowestPage(latestTasks);
    slowTasks = slowTasks.slice(0, 32);
    createHistogramData(function (histogramData) {
      callback({
        "totalPages": totalPages,
        "pdfcount": pdfCount,
        "latestVersion": latestVersion,
        "allVersions": versions,
        "data": histogramData,
        "crashedTasks": crashedTasks,
        "slowTasks": slowTasks
      });
    });
  };
  pdfs.getCount(db, function(err, pdfCount) {
    tasks.getList(db, {
      "type": "benchmark", "error": { $ne: null }, "version": latestVersion
    }, function(err, crashedTasks) {
      tasks.enrichTasksWithUrl(db, crashedTasks, function(crashedTasks) {
        tasks.getList(db, {
          "type": "benchmark", "result": { $ne: null}, "version": latestVersion
        }, function(err, latestTasks) {
          tasks.enrichTasksWithUrl(db, latestTasks, function(latestTasks) {
            outputPage(pdfCount, crashedTasks, latestTasks);
          });
        });
      });
    });
  });
}