var inspect = require("util").inspect;
var express = require("express");
var cons = require("consolidate");
var mongo = require("Mongodb");
var pdfs = require("./core/pdfs.js");
var Pdf = require("./core/pdf.js").Pdf;
var tasks = require("./core/tasks.js");
var Task = require("./core/task.js").Task;
var report = require("./core/report.js");

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
mongoClient.open(function(err, mongoClient) {
  var repoDatabase = mongoClient.db("pdfRepo");
  /* Static stuff */
  app.use("/css", express.static(__dirname + "/webpage_static/css"));
  app.use("/img", express.static(__dirname + "/webpage_static/img"));
  app.use("/font", express.static(__dirname + "/webpage_static/fonts"));
  app.use("/js", express.static(__dirname + "/webpage_static/js"));
  /* views */
  app.get("/", function(req, res) {
    pdfs.getCount(repoDatabase, function(err, pdfcount) {
      tasks.getCount(repoDatabase, function(err, taskcount) {
        res.render("index", {
          "title": "Dashboard",
          "pdfcount": pdfcount,
          "taskcount": taskcount,
        });
      })
    });
  });

  app.get("/pdfs.html", function(req, res) {
    pdfs.getList(repoDatabase, {}, function(err, pdfs) {
      res.render("pdfs", {
        "title": "PDFs",
        "count": pdfs.length,
        "pdfs": pdfs
      });
    });
  });
  app.get("/pdfs/:fileid.html", function(req, res) {
    pdfs.getPdf(repoDatabase, req, function(err, pdf) {
      res.render("detail", {
        "title": "PDF: " + req.params.fileid,
        "object": JSON.stringify(pdf, null, 2),
      });
    });
  });
  app.get("/pdfs/:fileid.pdf", function(req, res) {
    pdfs.getPdffile(repoDatabase, req, res);
  });

  app.get("/tasks.html", function(req, res) {
    tasks.getList(repoDatabase, {}, function(err, tasks) {
      res.render("tasks", {
        "title": "Tasks",
        "count": tasks.length,
        "tasks": tasks
      });
    });
  });
  app.get("/tasks_failed.html", function(req, res) {
    tasks.getList(repoDatabase, { error: { $ne: null }}, function(err, tasks) {
      res.render("tasks", {
        "title": "Failed Tasks",
        "count": tasks.length,
        "tasks": tasks
      });
    });
  });
  app.get("/tasks_unfinished.html", function(req, res) {
    tasks.getList(repoDatabase, { result: null, error: null }, function(err, tasks) {
      res.render("tasks", {
        "title": "Unfinished Tasks",
        "count": tasks.length,
        "tasks": tasks
      });
    });
  });

  app.get("/report.html", function(req, res) {
    tasks.getVersions(repoDatabase, function(err, versions) {
      versions.sort().reverse();
      report.getReportData(repoDatabase, versions, versions[0], function(d) {
        res.render("report", d);
      })
    })
  });
});

app.listen(8080);
console.log("PdfRepo Admin is listening on port 8080 ...");