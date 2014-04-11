var Task = require("./task.js").Task;

module.exports.getHistogramData = function(results, options) {
  options = options || {};
  var i, j;
  var normalizedData = [];
  var varianceSum = 0;
  for (i = 0; i < results.length; i++) {
    var r = results[i].result;
    if (results.Error) {
      continue;
    }
    var times = r.timesPerPage;
    var variance = r.variance;
    var baseline = r.baseline;
    if (!times) {
      continue;
    }
    for (j = 0; j < times.length; j++) {
      var t = times[j];
      if (typeof t == "number") {
        normalizedData.push(t / baseline);
        varianceSum += variance[j] / t;
      }
    };
  };

  normalizedData.sort();

  var numberOfBuckets = options.numberOfBuckets || 22;
  var maxValue = options.maxValue || 2.2;
  var step = maxValue / numberOfBuckets;

  var buckets = [];
  var counts = [];
  var percentage = [];
  var totalPages = normalizedData.length;
  j = 0;
  for (i = 0; i < numberOfBuckets; i++) {
    var count = 0;
    var smallerThan = (i + 1) * step;
    while (normalizedData[j] < smallerThan) {
      count++;
      j++;
    }
    buckets.push("'" + smallerThan.toFixed(1) + "x'");
    percentage.push((count / totalPages * 100).toFixed(1));
    counts.push(count);
  };
  buckets.push("'Slower'");
  var larger = normalizedData.length - j;
  percentage.push((larger / totalPages * 100).toFixed(1));
  counts.push(larger);

  console.log(varianceSum);
  var averageVariance = (varianceSum / totalPages * 100).toFixed(4);

  return {
    "buckets": buckets,
    "count": counts,
    "percentage": percentage,
    "totalPages": totalPages,
    "averageVariance": averageVariance
  };
}

module.exports.sortBySlowestPage = function(tasks) {
  var result = [];
  for (i = 0; i < tasks.length; i++) {
    var t = tasks[i];
    if (t.error || !t.result) {
      continue;
    }
    var times = t.result.timesPerPage;
    var baseline = t.result.baseline;
    if (!times) {
      continue;
    }
    var normalizedData = [];
    for (j = 0; j < times.length; j++) {
      var tt = times[j];
      if (typeof tt == "number") {
        normalizedData.push({
          n: tt / baseline,
          p: j
        });
      }
    };
    normalizedData.sort(function(a, b){
      return a.n < b.n ? 1 : -1;
    });
    var slowest = normalizedData[0];
    t.slowestPage = slowest.n;
    t.slowestPageNumber = slowest.p + 1;
    result.push(t);
  };
  result.sort(function(a, b){
    return a.slowestPage < b.slowestPage ? 1 : -1;
  });
  return result;
}