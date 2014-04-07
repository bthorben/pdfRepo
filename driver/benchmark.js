var BenchmarkTask = function(dbTask, successCallback, errorCallback) {
  this.init(dbTask, successCallback, errorCallback);
}
var BenchmarkTaskPrototype = function() {
  this.run = function() {
    this.currentPage = 0;
    this.result = { time_per_page: []};
    var fileUrl = "../pdfs/" + this.dbTask.fileid + "/file";
    // first page is 1
    var numberOfPages;
    PDFJS.getDocument(fileUrl).then(function(pdfDoc) {
      this.numberOfPages = pdfDoc.numPages;
      this._testNextPage(pdfDoc);
    }.bind(this));
  }

  this._testNextPage = function(pdfDoc) {
    this.currentPage++;
    if (this.currentPage > this.numberOfPages) {
      this.successCallback(this.result);
      return;
    }

    this.log("Processing page " + this.currentPage +
             " / " + this.numberOfPages);

    var scale = 1.0;
    var viewport = page.getViewport(scale);
    var dummyCanvas = document.createElement("canvas");
    var context = dummyCanvas.getContext("2d");
    dummyCanvas.height = viewport.height;
    dummyCanvas.width = viewport.width;
    var renderContext = {
      canvasContext: context,
      viewport: viewport
    };

    var start = performance.now();
    pdfDoc.getPage(this.currentPage).then(function(page) {
      page.render(renderContext).promise.then(function success() {
        var timeSpent = performance.now() - start;
        this.result.time_per_page.push(timeSpent);
        this._testNextPage(pdfDoc);
      }.bind(this));
    }.bind(this), function error() {
        this.log("Error processing page " + this.currentPage +
                 " / " + this.numberOfPages);
        this.errorCallback("Error at page " + this.currentPage);
    }.bind(this));
  }
}
BenchmarkTaskPrototype.prototype = new TaskRunnerPrototype();
BenchmarkTask.prototype = new BenchmarkTaskPrototype();