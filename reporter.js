var http = require('http');
var fs = require("fs");
var util = require('./core/util.js');
var mongo = require("mongodb");
var dust = require("dustjs-linkedin");
var ncp = require("ncp").ncp;
    ncp.limit = 16;
var report = require("./core/report.js");
var inspect = require("util").inspect;

var STATIC_CONTENT = "webpage_static/";
var VIEWS_PATH = "webpage_views/";

var arguments = process.argv.slice(2);
if (arguments.length < 2) {
  console.log("Usage: folder_to_output_in versions");
  console.log("First given version is treated as latest");
  process.exit();
}
var outputFolder = arguments[0];
var histogramVersions = arguments[1].split(",");
var latestVersion = histogramVersions[0];

var dustFiles = fs.readdirSync(VIEWS_PATH);
for(var i = 0; i < dustFiles.length - 1; i++) {
  var file = dustFiles[i];
  var ss = file.split(".");
  if (ss[1] != "dust") {
    continue;
  }
  var fileContent = fs.readFileSync(VIEWS_PATH + file) + "";
  dust.loadSource(dust.compile(fileContent, ss[0]));
}

ncp(STATIC_CONTENT, outputFolder, function (err) {
  if (err) {
   return console.error("Error copying static content: " + err);
  }
  outputHtmlContent();
});

function outputHtmlContent() {
  var mongoClient = new mongo.MongoClient(new mongo.Server("localhost", 27017));
  mongoClient.open(function(err, mongoClient) {
    var repoDatabase = mongoClient.db("pdfRepo");
    report.getReportData(repoDatabase, histogramVersions, latestVersion,
                         function(reportData) {
      dust.render("public_report", reportData, function(err, out) {
        if (err) {
          return console.error("Error rendering static content: " + err);
        }
        fs.writeFileSync(outputFolder + "index.html", out);
        process.exit();
      });
    });
  });
}