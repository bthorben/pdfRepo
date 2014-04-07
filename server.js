var express = require("express");
var mongo = require("Mongodb");
var inspect = require("util").inspect;
var fs = require("fs");
var pdfs = require("./core/pdfs.js");
var Pdf = require("./core/pdf.js").Pdf;
var tasks = require("./core/tasks.js");
var Task = require("./core/task.js").Task;


var app = express();
app.configure(function () {
  app.use(express.logger("dev"));
  app.use(express.json());
  app.use(express.urlencoded());
});

var mongoClient = new mongo.MongoClient(new mongo.Server('localhost', 27017));
mongoClient.open(function(err, mongoClient) {
  /* Static stuff */
  app.use("/driver", express.static(__dirname + "/driver"));
  app.use("/admin", express.static(__dirname + "/admin"));

  var repoDatabase = mongoClient.db("pdfRepo");
  /* Pdf handling */
  app.get("/pdfs", function(req, res) {
    pdfs.getList(repoDatabase, req, res);
  });
  app.get("/pdfcount", function(req, res) {
    pdfs.getCount(repoDatabase, req, res);
  });
  app.get("/pdfs/:fileid", function(req, res) {
    pdfs.getPdf(repoDatabase, req, res);
  });
  app.get("/pdfs/:fileid/file", function(req, res) {
    pdfs.getPdffile(repoDatabase, req, res);
  });
  app.post("/pdfs/:fileid", function(req, res) {
    pdfs.insertPdf(repoDatabase, req, res);
  });
  /* Tasks handling */
  app.get("/tasks", function(req, res) {
    tasks.getList(repoDatabase, req, res);
  });
  app.get("/taskcount", function(req, res) {
    tasks.getCount(repoDatabase, req, res);
  });
  app.get("/task", function(req, res) {
    tasks.getTask(repoDatabase, req, res);
  });
  app.post("/tasks/all", function(req, res) {
    tasks.insertTaskForAllFiles(repoDatabase, req, res);
  });
});

app.listen(3000);
console.log("PdfRepo is listening on port 3000 ...");