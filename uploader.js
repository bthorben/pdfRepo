var APP_PORT = 3000;
var UPLOAD_TIMEOUT = 180000;

var http = require("http");
var fs = require("fs");
var request = require("request");
var util = require("./util/util.js");
var FormData = require("form-data");
var Pdf = require("./core/pdf.js").Pdf;
var posix = require("posix");
posix.setrlimit("nofile", { soft: 10000 });

// max tests
var semtest = require("semaphore")(2);
// max uploads
var sem = require("semaphore")(4);
http.globalAgent.maxSockets = 10000;

var argv = require("optimist")
    .usage("Usage:" +
           " $0" +
           " --host [string]" +
           " --folder [string]" +
           " -f  --source [string]" +
           " --start [num] --end [num]");
    .demand(["host", "folder"])
    .boolean("f")
    .argv;


var start = 0;
if (argv.start) {
  start = parseInt(argv.start, 10);
}
var length = Number.MAX_VALUE;
if (argv.max) {
  length = parseInt(argv.max, 10);
}

var files = fs.readdirSync(argv.folder);
files.sort();

var max = Math.min(start + length, files.length - 1);
for(var i = start; i < max; i++) {
  var file = files[i];
  var ss = file.split(".");
  if (ss[1] == "json") {
    var nextFile = files[i + 1];
    var sss = nextFile.split(".");
    if (sss[1] == "pdf" && ss[0] == sss[0]) {
      uploadPdf(argv.folder + nextFile, argv.folder + file);
    }
  }
}

function uploadPdf(pdfPath, jsonPath) {
  semtest.take(function() {
    console.log("Uploading " + pdfPath);
    var jsonContent = fs.readFileSync(jsonPath);
    if (jsonContent.length < 3) {
      semtest.leave();
      return;
    }
    var json = JSON.parse(jsonContent);
    console.log(json);

    console.log("Create form data for " + pdfPath);
    var filestream = fs.createReadStream(pdfPath);
    var fileid = util.padObjectId(json.fileid);
    var form = new FormData();
    form.append("fileid", fileid);
    form.append("url", json.url);
    form.append("source", argv.source || json.source || "upload");
    var currentTimeInSec = Date.now() / 1000 | 0;
    form.append("fetchDate", json.fetchDate || currentTimeInSec);
    form.append("pdffile", filestream);
    form.append("force", argv.f ? "true" : "false");

    console.log("Has the server this file already?");
    http.get({
      host: argv.host,
      port: APP_PORT,
      path: "/pdfs/" + fileid,
      agent: false
    }, function(response){
      var code = parseInt(response.statusCode);
      console.log("Check returned " + code);
      if (code != 404 && !argv.f) {
        console.log("Already there, aborting");
        semtest.leave();
      } else {
        semtest.leave();
        sem.take(function() {
          console.log("Make request to upload " + pdfPath);
          var request = http.request({
            method: "POST",
            host: argv.host,
            port: APP_PORT,
            path: "/pdfs/" + fileid,
            headers: form.getHeaders()
          });
          request.on("socket", function (socket) {
            socket.setTimeout(UPLOAD_TIMEOUT);
            socket.on("timeout", function() {
              request.abort();
              sem.leave();
            });
          });
          request.on("error", function(e) {
            console.log("Problem with request to " + argv.host + ": " + e.message);
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
    }).on("error", function(e){
      console.log("Error while checking: " + e.message);
      try {
        semtest.leave();
      } catch(e) {

      }
    });
  });
}