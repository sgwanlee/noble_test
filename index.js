var server = require("./server");
var router = require("./router");
var requestHandlers = require("./requestHandlers");

var handle = {}
handle["/"] = requestHandlers.index;
handle["/3"] = requestHandlers.three;
handle["/10"] = requestHandlers.ten;

server.start(router.route, handle);