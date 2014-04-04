(function DriverClosure() {

  var stdout;
  var queryParams;

  window.load = function load() {
    stdout = document.getElementById("stdout");
    queryParams = getQueryParameters();

    var r = new XMLHttpRequest();
    r.onload = function onload() {
      var response = this.responseText;
      log("got: " + response);
    };
    r.open("GET", "../task");
    r.send();
  };

  function getQueryParameters() {
    var qs = window.location.search.substring(1);
    var kvs = qs.split('&');
    var params = { };
    for (var i = 0; i < kvs.length; ++i) {
      var kv = kvs[i].split('=');
      params[unescape(kv[0])] = unescape(kv[1]);
    }
    return params;
  }

  function log(message) {
    stdout.innerHTML += message + "\n";
    if (message.lastIndexOf('\n') >= 0) {
      if ((stdout.scrollHeight - stdout.scrollTop) <= stdout.offsetHeight) {
        stdout.scrollTop = stdout.scrollHeight;
      }
    }
  }

})();