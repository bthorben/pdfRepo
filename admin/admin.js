var pdfCount = document.getElementById("pdfcount");
var pdfContainer = document.getElementById("pdfsContainer");
var taskCount = document.getElementById("taskcount");
var taskContainer = document.getElementById("tasksContainer");

function populateCounts() {
  if (pdfCount) {
    _makeRequest("pdfcount", function callback() {
      pdfCount.innerText = this.responseText;
    });
  }
  if (taskCount) {
    _makeRequest("taskcount", function callback() {
      taskCount.innerText = this.responseText;
    });
  }
}

function populatePdfList() {
  _makeRequest("pdfs", function callback() {
    var response = JSON.parse(this.responseText);
    pdfContainer.innerHtml = "";
    var pdf, tr, td, trBuffer = document.createDocumentFragment();
    for (var i = 0; i < response.length; i++) {
      pdf = response[i];
      tr = _makeRow(pdf, ["fileid", "url", "source"]);
      trBuffer.appendChild(tr);
    };
    pdfContainer.appendChild(trBuffer);
  });
}

function populateTaskList() {
  _makeRequest("tasks", function callback() {
    var response = JSON.parse(this.responseText);
    taskContainer.innerHtml = "";
    var pdf, tr, td, trBuffer = document.createDocumentFragment();
    for (var i = 0; i < response.length; i++) {
      pdf = response[i];
      tr = _makeRow(pdf, ["type", "fileid", "creationDate", "result"]);
      trBuffer.appendChild(tr);
    };
    taskContainer.appendChild(trBuffer);
  });
}

function _makeRequest(target, callback) {
  var r = new XMLHttpRequest();
  r.onload = callback;
  r.open("GET", "../" + target);
  r.send();
}

function _makeRow(object, fields) {
  tr = document.createElement("tr");
  for (var i = 0; i < fields.length; i++) {
    var f = fields[i];
    td = document.createElement("td");
    td.appendChild(document.createTextNode(object[f]));
    tr.appendChild(td);
  };
  return tr;
}