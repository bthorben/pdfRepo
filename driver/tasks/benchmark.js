var BenchmarkTask = function(dbTask, callback, log) {
  this.init(dbTask, callback, log);
}
var BenchmarkTaskPrototype = function() {
  this.numberOfRuns = 5;

  this.combineResults = function(results) {
    var i, j, resultsOfPage, sum, combinedResults = [];
    for (i = 0; i < this.numberOfPages; i++) {
      resultsOfPage = [];
      for (j = 0; j < this.numberOfRuns; j++) {
        resultsOfPage.push(results[j][i]);
      }
      resultsOfPage.sort();
      sum = 0;
      numResults = 0;
      for (j = 1; j < this.numberOfRuns - 1; j++) {
        var rop = resultsOfPage[j]
        if (rop) {
          sum += rop;
          numResults++;
        }
      }
      combinedResults[i] = sum / numResults;
    };

    return combinedResults;
  }

  this.testPage = function(pdfDocument, pageNumber, callback) {
    var dummyCanvas = document.createElement("canvas");
    document.body.innerHTML = "";
    document.body.appendChild(dummyCanvas);
    var context = dummyCanvas.getContext("2d");
    var start = performance.now();
    console.log(this.pdfDocument);
    pdfDocument.getPage(this.currentPage).then(function(page) {
      var viewport = page.getViewport(1.0);
      dummyCanvas.height = viewport.height;
      dummyCanvas.width = viewport.width;
      var renderContext = {
        canvasContext: context,
        viewport: viewport
      };
      page.render(renderContext).promise.then(function success() {
        var timeSpent = performance.now() - start;
        callback(null, timeSpent);
      }.bind(this));
    }.bind(this), function error() {
        callback("can't get page");
    }.bind(this));
  }

}
BenchmarkTaskPrototype.prototype = new TaskPrototype();
BenchmarkTask.prototype = new BenchmarkTaskPrototype();