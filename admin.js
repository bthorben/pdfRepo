var inspect = require("util").inspect;
var express = require("express");
var cons = require("consolidate");
var mongo = require("mongodb");
var pdfs = require("./core/pdfs.js");
var Pdf = require("./core/pdf.js").Pdf;
var tasks = require("./core/tasks.js");
var Task = require("./core/task.js").Task;
var report = require("./core/report.js");
var data = require("./core/data.js");

var app = express();
app.engine("dust", cons.dust);
app.configure(function () {
  app.set("view engine", "dust");
  app.set("views", __dirname + "/webpage_views");
  app.use(express.logger("dev"));
  app.use(express.json());
  app.use(express.urlencoded());
});

var mongoClient = new mongo.MongoClient(new mongo.Server('localhost', 27017));
mongoClient.open(function(err, client) {
  var repoDatabase = client.db("pdfRepo");
  app.use("/css", express.static(__dirname + "/webpage_static/css"));
  app.use("/img", express.static(__dirname + "/webpage_static/img"));
  app.use("/font", express.static(__dirname + "/webpage_static/fonts"));
  app.use("/js", express.static(__dirname + "/webpage_static/js"));

  function render(res, page, params) {
    tasks.getVersions(repoDatabase, function(err, versions) {
      params.versions = versions;
      res.render(page, params);
    });
  }

  app.get("/", function(req, res) {
    pdfs.getCount(repoDatabase, function(err, pdfcount) {
      tasks.getCount(repoDatabase, function(err, taskcount) {
        tasks.getCount(repoDatabase, {result: null, error: null}, function(e, unfinished) {
          render(res, "index", {
            "title": "Dashboard",
            "pdfcount": pdfcount,
            "taskcount": taskcount,
            "unfinishedcount": unfinished
          });
        });
      });
    });
  });

  app.get("/pdfs.html", function(req, res) {
    pdfs.getList(repoDatabase, {}, function(err, pdfs) {
      render(res, "pdfs", {
        "title": "PDFs",
        "count": pdfs.length,
        "pdfs": pdfs
      });
    });
  });
  app.get("/pdfs/:fileid.html", function(req, res) {
    pdfs.getPdf(repoDatabase, req, function(err, pdf) {
      render(res, "detail", {
        "title": "PDF: " + req.params.fileid,
        "object": JSON.stringify(pdf, null, 2),
      });
    });
  });
  app.get("/pdfs/:fileid.pdf", function(req, res) {
    pdfs.getPdffile(repoDatabase, req, res);
  });

  app.get("/tasks/all.html", function(req, res) {
    tasks.getList(repoDatabase, {}, function(err, tasks) {
      render(res, "tasks", {
        "title": "Tasks",
        "count": tasks.length,
        "tasks": tasks
      });
    });
  });

  app.get("/tasks/unfinished.html", function(req, res) {
    tasks.getList(repoDatabase, { result: null, error: null }, function(err, tasks) {
      render(res, "tasks", {
        "title": "Unfinished Tasks",
        "count": tasks.length,
        "tasks": tasks
      });
    });
  });

  app.get("/tasks/:version/failed.html", function(req, res) {
    tasks.getList(repoDatabase, {
      error: { $ne: null },
      version: req.params.version
    }, function(err, tasks) {
      render(res, "tasks", {
        "title": "Failed Tasks",
        "count": tasks.length,
        "tasks": tasks
      });
    });
  });

  app.get("/tasks/:version/slow.html", function(req, res) {
    tasks.getList(repoDatabase, {
      result: { $ne: null },
      version: req.params.version
    }, function(err, allTasksForVersion) {
      tasks.enrichTasksWithUrl(repoDatabase, allTasksForVersion,
                               function(allTasksForVersion) {
        var slowTasks = data.sortBySlowestPage(allTasksForVersion);
        render(res, "slow_tasks", {
          "title": "PDFs by slowest page",
          "slowTasks": slowTasks
        });
      });
    });
  });

  app.get("/report.html", function(req, res) {
    tasks.getVersions(repoDatabase, function(err, versions) {
      report.getReportData(repoDatabase, versions, versions[0], function(d) {
        render(res, "report", d);
      })
    })
  });
});

app.listen(80);
console.log("PdfRepo Admin is listening on port 8080 ...");