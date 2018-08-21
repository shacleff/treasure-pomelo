var crc = require('crc');

//
var Dispatcher = function () {

}

//根据crc算法选择一个服务器
Dispatcher.prototype.dispatch = function (uid, connectors) {
	var index = Math.abs(parseInt(crc.crc32(uid)), 16) % connectors.length;
	return connectors[index];
};

//
module.exports = {
	id: "dispatcher",
	func: Dispatcher
}