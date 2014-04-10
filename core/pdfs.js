var Busboy = require("busboy");
var mongo = require("Mongodb");
var inspect = require("util").inspect;
var util = require('./util.js');

var Pdf = require("./pdf.js").Pdf;


module.exports.getList = function getList(db, callback) {
  db.collection("pdfs", function(err, collection) {
    var f = collection.find({}, { fileid: 1, url: 1, source: 1, _id:0 });
    f.toArray(callback);
  });
}

module.exports.getCount = function getCount(db, callback) {
  db.collection("pdfs", function(err, collection) {
    collection.count(callback);
  });
}

module.exports.getPdf = function getPdf(db, req, callback) {
  var fileid = req.params.fileid;
  db.collection("pdfs", function(err, collection) {
    collection.findOne({ "fileid": fileid }, callback);
  });
}

module.exports.getPdffile = function getPdffile(db, req, res) {
  var fileid = req.params.fileid;
  var objectId = mongo.ObjectID.createFromHexString(fileid);
  var store = new mongo.GridStore(db, objectId, "r");
  store.open(function(err, gs) {
    if (err) {
      res.send({ "Error": "Cannot open file, " + err });
    } else {
      var fileStream = gs.stream(true);
      res.set("Content-Type", "application/pdf");
      res.set("content-disposition", "attachment; filename=" + fileid + ".pdf");
      fileStream.pipe(res);
    }
  });
}

function processFormData(req, callback) {
  console.log("processing form data ...")
  var fileBuffer;
  var pdf, fileid = req.params.fileid, url, source, fetchDate;
  var busboy = new Busboy({ headers: req.headers });
  busboy.on("file", function(fieldname, file, filename, encoding, mimetype) {
    console.log("receiving file ...");
    var data = [];
    var length = 0;
    file.on("data", function(d) {
      data.push(d);
      length += d.length;
    });
    file.on("end", function() {
      console.log("writing to filebuffer ...");
      fileBuffer = new Buffer(length);
      for (var i = 0, len = data.length, pos = 0; i < len; i++) {
        data[i].copy(fileBuffer, pos);
        pos += data[i].length;
      }
    });
  });
  busboy.on("field", function(fieldname, val, valTruncated, keyTruncated) {
    switch(fieldname) {
      case "fileid":
        if (val != req.params.fileid) {
          throw "fileid does not match";
        }
        fileid = val;
        break;
      case "url":
        url = val;
        break;
      case "source":
        source = val;
        break;
      case "fetchDate":
        fetchDate = val;
        break;
      default:
        throw "unknown field '" + fieldname + "'";
    }
  });
  busboy.on("finish", function() {
    pdf = new Pdf(fileid, url, source, fetchDate);
    console.log("processing received data ...");
    callback(pdf, fileBuffer);
  });
  req.pipe(busboy);
}

module.exports.insertPdf = function insertPdf(db, req, res) {
  var fileid = req.params.fileid;
  processFormData(req, function(pdf, fileBuffer) {
    db.collection("pdfs", function(err, collection) {
      collection.count({ "fileid": fileid }, function(err, count) {
        console.log("checking for collisions ...");
        if (count > 0) {
          console.log("error, we already have this id ...");
          res.statusCode = 200;
          res.send({
            "Error": "A pdf with that fileid is already present",
            "Pdf": pdf
          });
        } else {
          console.log("inserting document ...");
          collection.insert(pdf, { w: 1, wtimeout: 30 }, function(err, result) {
            console.log("storing file ...");
            if (err) {
              res.statusCode = 200;
              res.send({
                "Error": "An error has occurred while inserting",
                "Pdf": pdf
              });
            } else {
              var objectId = mongo.ObjectID.createFromHexString(fileid);
              var store = new mongo.GridStore(db, objectId, "w");
              store.open(function(err, gs) {
                gs.write(fileBuffer, function(err, gs) {
                  if (err) {
                    res.send({ "Error": "Cannot write file, " + err });
                  } else {
                    console.log("Inserted pdf " + objectId);
                    res.send({ "Success": "File written, " + objectId })
                  }
                  gs.close();
                });
              });
            }
          });
        }
      });
    });
  });
}