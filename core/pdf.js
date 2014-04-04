module.exports.Pdf = function(fileid, url, source, fetchDate) {
  this.init(fileid, url, source, fetchDate);
};
var PdfPrototype = function() {
  this.init = function(fileid, url, source, fetchDate) {
    this.fileid = fileid;
    this.url = url;
    this.source = source;
    this.fetchDate = fetchDate;
  }
}
module.exports.Pdf.prototype = new PdfPrototype();