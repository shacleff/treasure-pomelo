var logger = require('pomelo-logger').getLogger('bearcat-treasures', 'ActionManagerService');
var Queue = require('pomelo-collection').queue;

var ActionManagerService = function (opts) {
    opts = opts || {};
    this.limit = opts.limit || 10000; // 队列中最大元素个数

    this.actionMap = {}; // type-->id
    this.actionQueue = new Queue(this.limit); // FIFO
};

ActionManagerService.prototype.addAction = function (action) {
    if (action.singleton) { // 只能被添加一次的动作，先暂停掉动作
        this.abortAction(action.type, action.id);
    }

    this.actionMap[action.type] = this.actionMap[action.type] || {}; //当前动作map
    this.actionMap[action.type][action.id] = action; // 动作map里面添加另外一个动作
    return this.actionQueue.push(action); // 动作队列加入动作
};

/**
 * abort an action, the action will be canceled and not excute
 * @param {String} type Given type of the action
 * @param {String} id The action id
 */
ActionManagerService.prototype.abortAction = function (type, id) {

    if (!this.actionMap[type] || !this.actionMap[type][id]) { //动作map没有这个动作，那就没办法停止
        return;
    }

    this.actionMap[type][id].aborted = true;
    delete this.actionMap[type][id];
};

ActionManagerService.prototype.abortAllAction = function (id) { // 停止某个id的动作
    for (var type in this.actionMap) {
        if (!!this.actionMap[type][id]) {
            this.actionMap[type][id].aborted = true;
        }
    }
};

ActionManagerService.prototype.update = function () { // Update all action
    var length = this.actionQueue.length;

    for (var i = 0; i < length; i++) {
        var action = this.actionQueue.pop();

        if (action.aborted) {
            continue;
        }
        action.update(); //动作更新一下，接下来判断是否删除，还是冲洗放回队列
        if (!action.finished) { //没有播放完毕，就重新放入队列末端
            this.actionQueue.push(action);
        } else { //播放完毕就删除
            delete this.actionMap[action.type][action.id];
        }
    }
};

module.exports = {
    id: "actionManagerService",
    func: ActionManagerService
};