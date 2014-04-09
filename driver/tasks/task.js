var Task = function(dbTask, callback, log) {
  this.init(dbTask, callback, log);
}
var TaskPrototype = function() {
  this.init = function(dbTask, callback, log) {
    this.dbTask = dbTask;
    this.callback = callback;
    this.log = log;
    this.results = [];
    if (this.dbTask.type == "calibration") {
      this.fileUrl = this.dbTask.file;
    } else {
      this.fileUrl = "../pdfs/" + this.dbTask.fileid + "/file";
    }
  }

  this.run = function() {
    this.currentRun = -1;
    this.computeRun();
  }

  this.computeRun = function() {
    this.currentRun++;
    if (this.currentRun >= this.numberOfRuns) {
      var combinedResults = this.combineResults(this.results);
      this.callback(null, combinedResults);
      return;
    }
    this.log("=== Run " + this.currentRun + " ===");
    this.results[this.currentRun] = [];
    // first page is 1
    this.currentPage = 0;
    var numberOfPages;
    PDFJS.getDocument(this.fileUrl).then(function(pdfDoc) {
      this.pdfDocument = pdfDoc;
      this.numberOfPages = pdfDoc.numPages;
      this.testNextPage(function() {
        this.computeRun();
      }.bind(this));
    }.bind(this));
  }

  this.testNextPage = function(callback) {
    this.currentPage++;
    if (this.currentPage > this.numberOfPages) {
      callback();
      return;
    }
    this.log("Processing page " + this.currentPage +
             " / " + this.numberOfPages);


    this.testPage(this.pdfDocument,
                  this.currentPage,
                  this.testPageCallback.bind(this, callback));
  }

  this.testPageCallback = function(callback, error, result) {
    if (error) {
      var msg = {
        "Error": error,
        "Page": this.currentPage
      }
      this.log(msg);
    }
    this.results[this.currentRun].push(result);
    this.testNextPage(callback);
  }

  // should be overridden in subclass
  this.numberOfRuns = 1;

  this.combineResults = function() {
    // implemented in subclass
  }

  this.testPage = function(pageNumber, callback) {
    // implemented in subclass
  }
}
Task.prototype = new TaskPrototype();