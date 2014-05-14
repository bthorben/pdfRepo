var APP_PORT = 3000;
var UPLOAD_TIMEOUT = 180000;

var fs = require("fs");
var mongo = require("mongodb");
var Pdf = require("./core/pdf.js").Pdf;
var request = require("request");
var util = require("./util/util.js");

// max uploads
var sem = require("semaphore")(1);

var argv = require("optimist")
    .usage("Usage: $0 --host [string] --folder [string] -f  --source [string] --start [num] --end [num]")
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

var mongoClient = new mongo.MongoClient(new mongo.Server(argv.host, 27017));
mongoClient.open(function(err, client) {
  if (err) {
    console.log("Connection to database failed");
    return;
  }
  db = client.db("pdfRepo");
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
    sem.take(function() {
      function checkAndInsert(err, count) {
        console.log("Checking for collisions ...");
        if (count > 0 && argv.f == false) {
          console.log("We already have this id ...");
          sem.leave();
        } else {
          console.log("Inserting document ...");
          collection.insert(pdf, { w: 1, wtimeout: 30 }, function(err) {
            if (err) {
              console.log("Error while inserting");
              sem.leave();
            } else {
              storeFile();
            }
          });
        }
      }

      function storeFile() {
        console.log("Storing file ...");
        var objectId = mongo.ObjectID.createFromHexString(fileid);
        var store = new mongo.GridStore(db, objectId, "w");
        store.open(function(err, gs) {
          var fileBuffer = fs.readFileSync(pdfPath);
          gs.write(fileBuffer, function(err, gs) {
            if (err) {
              console.log("Error, Cannot write file, " + err);
            } else {
              console.log("Inserted pdf " + objectId);
            }
            gs.close();
            sem.leave();
          });
        });
      }

      console.log("Inserting " + pdfPath);
      var jsonContent = fs.readFileSync(jsonPath);
      if (jsonContent.length < 3) {
        sem.leave();
        return;
      }
      var json = JSON.parse(jsonContent);
      console.log(json);

      console.log("Create form data for " + pdfPath);
      var fileid = util.padObjectId(json.fileid);

      var pdf = json;
      if (argv.source) {
        pdf.source = argv.source;
      }

      db.collection("pdfs", function(err, c) {
        collection = c;
        collection.count({ "fileid": pdf.fileid }, checkAndInsert);
      });
    });
  }
});