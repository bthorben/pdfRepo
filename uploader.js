var http = require('http');
var fs = require("fs");
var request = require('request');
var util = require('./core/util.js');
var FormData = require('form-data');
var Pdf = require("./core/pdf.js").Pdf;

// max uploads
var sem = require('semaphore')(1);
http.globalAgent.maxSockets = 32;

var arguments = process.argv.slice(2);
if (arguments.length < 2) {
  console.log("Usage: folder_to_explore host [source_to_use]")
  process.exit();
}
var pdfFolder = arguments[0];
var serverHost = arguments[1];
var pdfSource = arguments[2];

var files = fs.readdirSync(pdfFolder);
files.sort();

for(var i = 0; i < files.length - 1; i++) {
  var file = files[i];
  var ss = file.split(".");
  if (ss[1] == "json") {
    var nextFile = files[i + 1];
    var sss = nextFile.split(".");
    if (sss[1] == "pdf" && ss[0] == sss[0]) {
      uploadPdf(pdfFolder + nextFile, pdfFolder + file);
    }
  }
}

function uploadPdf(pdfPath, jsonPath) {
  sem.take(function() {
    console.log("Uploading " + pdfPath);
    var jsonContent = fs.readFileSync(jsonPath);
    if (jsonContent.length < 3) {
      sem.leave();
      return;
    }
    var json = JSON.parse(fs.readFileSync(jsonPath));
    console.log(json);

    console.log("Create form data for " + pdfPath);
    var filestream = fs.createReadStream(pdfPath);
    var fileid = util.padObjectId(json.fileid);
    var form = new FormData();
    form.append("fileid", fileid);
    form.append("url", json.url);
    form.append("source", json.source || pdfSource || "upload");
    var currentTimeInSec = Date.now() / 1000 | 0;
    form.append("fetchDate", json.fetchDate || currentTimeInSec);
    form.append("pdffile", filestream);

    console.log("Make request to upload " + pdfPath);
    var request = http.request({
      method: "POST",
      host: serverHost,
      port: 3000,
      path: "/pdfs/" + fileid,
      headers: form.getHeaders()
    });
    request.on("error", function(e) {
      console.log("Problem with request to '" + serverHost + "': " + e.message);
    });
    request.on("close", function(res){
      console.log(res);
      request.abort();
      sem.leave();
    });
    request.on("response", function(res) {
      console.log(res.statusCode);
      request.abort();
      sem.leave();
    });
    console.log("Piping form through " + pdfPath);
    form.pipe(request);
  });
}