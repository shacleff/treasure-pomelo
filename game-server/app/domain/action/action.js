/**
 * 动作基类，什么Move之类的子类进行扩展
 */

var id = 1;

/**
 * Action class, used to excute the action in server
 */
var Action = function(opts) {
	this.data = opts.data;
	this.id = opts.id || id++;
	this.type = opts.type || 'defaultAction';

	this.finished = false;
	this.aborted = false;
	this.singleton = false || opts.singleton;
}

/**
 * Update interface, default update will do nothing, every tick the update will be invoked
 * @api public
 */
Action.prototype.update = function() {};

module.exports = {
	id: "action",
	func: Action,
	scope: "prototype",
	abstract: true
};