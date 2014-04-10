var Task = function(dbTask, callback, report, onlyTestPageNumber) {
  this.init(dbTask, callback, report, onlyTestPageNumber);
}
var TaskPrototype = function() {
  this.init = function(dbTask, callback, report, onlyTestPageNumber) {
    this.dbTask = dbTask;
    this.callback = callback;
    this.report = report;
    this.onlyTestPageNumber = onlyTestPageNumber;
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
    if (this.currentRun >= this.numberOfRuns
        || (this.onlyTestPageNumber && this.currentRun == 1)) {
      var combinedResults = this.combineResults(this.results);
      this.callback(null, combinedResults);
      return;
    }
    this.report({
      type: "run",
      value: this.currentRun
    });
    this.results[this.currentRun] = [];
    // first page is 1
    this.currentPage = this.onlyTestPageNumber - 1 || 0;
    var numberOfPages;
    PDFJS.getDocument(this.fileUrl).then(function(pdfDoc) {
      this.pdfDocument = pdfDoc;
      this.numberOfPages = this.onlyTestPageNumber || pdfDoc.numPages;
      this.report({
        type: "totalPages",
        value: this.numberOfPages
      });
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
    this.report({
      type: "page",
      value: this.currentPage
    });

    this.testPage(this.pdfDocument,
                  this.currentPage,
                  this.testPageCallback.bind(this, callback));
  }

  this.testPageCallback = function(callback, error, result) {
    if (error) {
      this.report({
        type: "error",
        value: this.currentPage
      });
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