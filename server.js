var express = require("express");
var mongo = require("Mongodb");
var inspect = require("util").inspect;
var fs = require("fs");
var pdfs = require("./core/pdfs.js");
var Pdf = require("./core/pdf.js").Pdf;


var app = express();
app.configure(function () {
  app.use(express.logger("dev"));
  app.use(express.json());
  app.use(express.urlencoded());
});

var mongoClient = new mongo.MongoClient(new mongo.Server('localhost', 27017));
mongoClient.open(function(err, mongoClient) {
  var repoDatabase = mongoClient.db("pdfRepo");
  app.get("/pdfs", function(req, res) {
    pdfs.getOverview(repoDatabase, req, res);
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
  app.get("/task", function(req, res) {
    task = {
      id: 1,
      type: "test",
      fileid: 1
    }
    res.json(task);
  });
  app.use("/driver", express.static(__dirname + "/driver"));
});

app.listen(3000);
console.log("PdfRepo is listening on port 3000 ...");