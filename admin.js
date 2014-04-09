var inspect = require("util").inspect;
var express = require("express");
var cons = require("consolidate");
var mongo = require("Mongodb");
var pdfs = require("./core/pdfs.js");
var Pdf = require("./core/pdf.js").Pdf;
var tasks = require("./core/tasks.js");
var Task = require("./core/task.js").Task;
var data = require("./core/data.js");

var app = express();
app.engine("dust", cons.dust);
app.configure(function () {
  app.set("view engine", "dust");
  app.set("views", __dirname + "/admin/views");
  app.use(express.logger("dev"));
  app.use(express.json());
  app.use(express.urlencoded());
});

var mongoClient = new mongo.MongoClient(new mongo.Server('localhost', 27017));
mongoClient.open(function(err, mongoClient) {
  var repoDatabase = mongoClient.db("pdfRepo");
  /* Static stuff */
  app.use("/css", express.static(__dirname + "/admin/css"));
  app.use("/font", express.static(__dirname + "/admin/fonts"));
  app.use("/js", express.static(__dirname + "/admin/js"));

  /* views */
  app.get("/", function(req, res) {
    pdfs.getCount(repoDatabase, req, function(err, pdfcount) {
      tasks.getCount(repoDatabase, req, function(err, taskcount) {

        tasks.getResults(repoDatabase, "benchmark", function(err, results) {
          var h = data.getHistogramData(results);
          res.render("index", {
            "title": "PdfRepo - Dashboard",
            "pdfcount": pdfcount,
            "taskcount": taskcount,
            "histogramData": inspect(h)
          });
        });

      })
    });
  });
  app.get("/pdfs.html", function(req, res) {
    pdfs.getList(repoDatabase, req, function(err, pdfs) {
      res.render("pdfs", {
        "title": "PdfRepo - PDFs",
        "pdfcount": pdfs.length,
        "pdfs": pdfs
      });
    });
  });
  app.get("/tasks.html", function(req, res) {
    pdfs.getList(repoDatabase, req, function(err, tasks) {
      res.render("tasks", {
        "title": "PdfRepo - Tasks",
        "taskcount": tasks.length,
        "tasks": tasks
      });
    });
  });
});

app.listen(8080);
console.log("PdfRepo Admin is listening on port 8080 ...");