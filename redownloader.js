var APP_PORT = 3000;
var UPLOAD_TIMEOUT = 180000;

var fs = require("fs");
var http = require("http");
var crypto = require("crypto");

// max download connections
var downloadSem = require("semaphore")(32);

var argv = require("optimist")
    .usage("Usage: $0 --folder [string]")
    .demand(["folder"])
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
    var jsonContent = fs.readFileSync(argv.folder + file);
    if (jsonContent.length < 3) {
      semtest.leave();
      return;
    }
    var json = JSON.parse(jsonContent);
    downloadSem.take(downloadUrl.bind(null,
                                      json.url,
                                      argv.folder + ss[0] + ".pdf"));
  }
}

function downloadUrl(url, target, callback) {
  http.get(url, function(response) {
    var contentTypeHeader = response.headers["content-type"];
    if (contentTypeHeader && contentTypeHeader.indexOf("pdf") == -1) {
      downloadSem.leave();
      callback(false);
      return;
    }

    var shasum = crypto.createHash("sha1");
    var data = [], dataLen = 0;
    response.on("data", function(chunk) {
      data.push(chunk);
      shasum.update(chunk);
      dataLen += chunk.length;
    });

    response.on("end", function() {
      if (dataLen < 10) {
        downloadSem.leave();
        return;
      }
      var buf = new Buffer(dataLen);
      for (var i = 0, len = data.length, pos = 0; i < len; i++) {
          data[i].copy(buf, pos);
          pos += data[i].length;
      }

      var fileid = shasum.digest("hex").slice(0, 24);
      var f = fs.createWriteStream(target);
      f.end(buf);

      downloadSem.leave();
      console.log("Downloaded " + url);
    });
  }).on("error", function(e) {
    downloadSem.leave();
    console.log("Cannot download " + url);
    console.log("Error: " + e.message);
  });
}