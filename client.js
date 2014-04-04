var http = require("http");
var fs = require("fs");
var spawn = require("child_process").spawn;

var arguments = process.argv.slice(2);
if (arguments.length < 2) {
  console.log("Usage: path_to_browser hostname_of_server [source_to_use]")
  process.exit();
}
var pathToBrowser = arguments[0];
var hostnameOfServer = arguments[1];

var startUrl = "http://" + hostnameOfServer + ":3000/driver/driver.html" +
               "?host=" + hostnameOfServer;

spawn(pathToBrowser, [startUrl]);