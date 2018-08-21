var Code = require('../../../../../shared/code');
var bearcat = require('bearcat');
/**
 * Gate handler that dispatch user to connectors.
 */
var GateHandler = function(app) {
	this.app = app;
	this.dispatcher = null;
};

//玩家连接成功，给玩家从服务器群中分配一个connector服务器
GateHandler.prototype.queryEntry = function(msg, session, next) {
	var uid = msg.uid;
	if (!uid) {
		next(null, {
			code: Code.FAIL
		});
		return;
	}

	var connectors = this.app.getServersByType('connector');
	if (!connectors || connectors.length === 0) {
		next(null, {
			code: Code.GATE.NO_SERVER_AVAILABLE
		});
		return;
	}

	/**
	 * 通过crc算法将玩家输入的用户名字符串转换为整数，然后对connectors服务器的个数取余hash到某个connector服务器上,
	 * 最后将要连接的connector服务器的host和port返回给客户端.
	 * 
	 * 这样：客户单就能连接到所分配的connector服务器了
	 */
	var res = this.dispatcher.dispatch(uid, connectors);
	next(null, {
		code: Code.OK,
		host: res.host,
		port: res.clientPort
	});
};

module.exports = function(app) {
	return bearcat.getBean({
		id: "gateHandler",
		func: GateHandler,
		args: [{
			name: "app",
			value: app
		}],
		props: [{
			name: "dispatcher",
			ref: "dispatcher"
		}]
	});
};