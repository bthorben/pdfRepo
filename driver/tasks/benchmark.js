var BenchmarkTask = function(dbTask, callback, report, onlyTestPageNumber) {
  this.init(dbTask, callback, report, onlyTestPageNumber);
}
var BenchmarkTaskPrototype = function() {
  this.numberOfRuns = 5;

  this.combineResults = function(results) {
    if (this.onlyTestPageNumber) {
      return;
    }
    var i, j, resultsOfPage, sum, combinedResults = [], avg, variance = [];
    for (i = 0; i < this.numberOfPages; i++) {
      resultsOfPage = [];
      for (j = 0; j < this.numberOfRuns; j++) {
        resultsOfPage.push(results[j][i]);
      }
      resultsOfPage.sort();
      sum = 0;
      numResults = 0;
      for (j = 1; j < this.numberOfRuns; j++) {
        var rop = resultsOfPage[j]
        if (rop) {
          sum += rop;
          numResults++;
        }
      }
      avg = sum / numResults;
      sum = 0;
      for (j = 1; j < this.numberOfRuns; j++) {
        var rop = resultsOfPage[j]
        if (rop) {
          sum += (rop - avg) * (rop - avg);
          numResults++;
        }
      }
      variance[i] = Math.sqrt(sum / numResults);
      combinedResults[i] = avg;
    };

    var r = {
      "timesPerPage": combinedResults,
      "variance": variance,
      "originalRuns": results
    }

    return r;
  }

  this.testPage = function(pdfDocument, pageNumber, callback) {
    var dummyCanvas = document.createElement("canvas");
    document.body.innerHTML = "";
    document.body.appendChild(dummyCanvas);
    var context = dummyCanvas.getContext("2d");
    var start = performance.now();
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
        setTimeout(function() {
          callback(null, timeSpent);
        }, 10);
      }.bind(this));
    }.bind(this), function error() {
        callback("can't get page");
    }.bind(this));
  }

}
BenchmarkTaskPrototype.prototype = new TaskPrototype();
BenchmarkTask.prototype = new BenchmarkTaskPrototype();