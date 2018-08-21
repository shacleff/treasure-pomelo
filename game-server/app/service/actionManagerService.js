var logger = require('pomelo-logger').getLogger('bearcat-treasures', 'ActionManagerService');
var Queue = require('pomelo-collection').queue;

/**
 * 动作服务
 * Action Manager, which is used to contrll all action
 */
var ActionManagerService = function(opts) {

	//
	opts = opts || {};

	//队列中最大元素个数
	this.limit = opts.limit || 10000;

	//The map used to abort or cancel action, it's a two level map, first leven key is type, second leven is id
	this.actionMap = {};

	//The action queue, default size is 10000, all action in the action queue will excute in the FIFO order
	this.actionQueue = new Queue(this.limit);
};

/**
 * Add action
 * @param {Object} action  The action to add, the order will be preserved
 */
ActionManagerService.prototype.addAction = function(action) {

	//只能被添加一次的动作，先暂停掉动作
	if (action.singleton) {
		this.abortAction(action.type, action.id);
	}

	//当前动作map
	this.actionMap[action.type] = this.actionMap[action.type] || {};

	//动作map里面添加另外一个动作
	this.actionMap[action.type][action.id] = action;

	//动作队列加入动作
	return this.actionQueue.push(action);
};

/**
 * abort an action, the action will be canceled and not excute
 * @param {String} type Given type of the action
 * @param {String} id The action id
 */
ActionManagerService.prototype.abortAction = function(type, id) {
	//动作map没有这个动作，那就没办法停止
	if (!this.actionMap[type] || !this.actionMap[type][id]) {
		return;
	}

	this.actionMap[type][id].aborted = true;
	delete this.actionMap[type][id];
};

/**
 * 停止某个id的动作
 * Abort all action by given id, it will find all action type
 */
ActionManagerService.prototype.abortAllAction = function(id) {
	for (var type in this.actionMap) {
		if (!!this.actionMap[type][id])
			this.actionMap[type][id].aborted = true;
	}
};

/**
 * Update all action
 * @api public
 */
ActionManagerService.prototype.update = function() {
	var length = this.actionQueue.length;

	for (var i = 0; i < length; i++) {
		var action = this.actionQueue.pop();

		if (action.aborted) {
			continue;
		}

		//动作更新一下，接下来判断是否删除，还是冲洗放回队列
		action.update();

		//没有播放完毕，就重新放入队列末端
		if (!action.finished) {
			this.actionQueue.push(action);
		} 
		//播放完毕就删除
		else {
			delete this.actionMap[action.type][action.id];
		}
	}
};

module.exports = {
	id: "actionManagerService",
	func: ActionManagerService
}