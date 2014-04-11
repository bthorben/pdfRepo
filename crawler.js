var crypto = require("crypto");
var fs  = require("fs");
var http = require("http");
var lazy = require("lazy");
var Pdf = require("./core/pdf.js").Pdf;
var request = require("request");
// max download connections
var downloadSem = require("semaphore")(32);
// max searched
var searchSem = require("semaphore")(1);
// ignore https, as it"s not supported by nodes http
var PDF_REGEX_TEXT = "q=(http://(?!webcache)(?:\\S(?!\\.pdf))*\\S\\.pdf)";
var PDF_REGEX = new RegExp(PDF_REGEX_TEXT, "g");
var DEFAUL_SOURCE = "websearch";


var arguments = process.argv.slice(2);
if (arguments.length < 3) {
  console.log("Usage: query_url path_to_keywordfile " +
               "path_to_outputfolder [name_of_source]");
  process.exit();
}
var query_url = arguments[0]
var keywordsFilepath = arguments[1];
var outputFolderpath = arguments[2];
var sourceName = arguments[3] || DEFAUL_SOURCE;

pdfsFromKeywordFile("./" + keywordsFilepath,
                    outputFolderpath,
                    function(countDownloaded) {
  console.log("Finished downloading " + countDownloaded + " files");
  process.exit();
});

function pdfsFromKeywordFile(keywordFilePath, outputFolder, callback) {
  var urls = Object.create(null);

  var request_count = 0;
  var keywordFile = new lazy(fs.createReadStream(keywordFilePath));
  keywordFile.lines.forEach(function(keyword) {
    console.log("Searching for " + keyword);
    request_count += 3;
    doWebsearch(keyword, function(success) {
      if (!success) {
        console.log("Error searching for " + keyword);
      }
      request_count--;
      if (request_count == 0) {
        downloadUrls();
      }
    });
  });

  function doWebsearch(keyword, callback) {
    console.log("Requesting " + query_url + keyword + " ...");
    // page 1
    setTimeout(function() {
      request(query_url + keyword, handleResponse);
    }, (Math.random() * (20000 - 1000) + 1000));
    // page 2
    setTimeout(function() {
      request(query_url + keyword + "&start=10", handleResponse);
    }, (Math.random() * (50000 - 10000) + 10000));
    // page 3
    setTimeout(function() {
      request(query_url + keyword + "&start=20", handleResponse);
    }, (Math.random() * (80000 - 20000) + 20000));

    function handleResponse(error, response) {
      if (!error && response.statusCode == 200) {
        var match;
        while(match = PDF_REGEX.exec(response.body)) {
          var url = decodeURIComponent(match[1]);
          console.log("found " + url);
          urls[url] = true;
        }
        callback(true);
      } else {
        console.log(response.statusCode);
        callback(false)
      }
    }
  }

  function downloadUrls() {
    var downloadCount = 0;
    var sucessfullDownloadsCount = 0;
    var url;
    for (url in urls) {
      downloadCount++;
      downloadSem.take(downloadUrl.bind(this, url, function(url, success) {
        if (success) {
          console.log("Downloaded " + url.slice(0, 66) + "...");
          sucessfullDownloadsCount++;
        }
        downloadCount--;
        if (downloadCount == 0) {
          callback(sucessfullDownloadsCount);
        }
      }.bind(this, url)));
    }
  }
}

function downloadUrl(url, callback) {
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
        callback(false);
        return;
      }
      var buf = new Buffer(dataLen);
      for (var i = 0, len = data.length, pos = 0; i < len; i++) {
          data[i].copy(buf, pos);
          pos += data[i].length;
      }

      var fileid = shasum.digest("hex").slice(0, 24);
      var f = fs.createWriteStream(outputFolderpath + fileid + ".pdf");
      f.end(buf);
      var f = fs.createWriteStream(outputFolderpath + fileid + ".json");
      var currentTimeInSec = Date.now() / 1000 | 0;
      var pdf = new Pdf(fileid, url, sourceName, currentTimeInSec);
      f.end(JSON.stringify(pdf, null, 2));

      downloadSem.leave();
      callback(true);
    });
  }).on("error", function(e) {
    downloadSem.leave();
    console.log("Error: " + e.message);
    callback(false);
  });
}