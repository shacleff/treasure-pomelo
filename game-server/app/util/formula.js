var logger = require('pomelo-logger').getLogger('bearcat-treasures', 'Formula');

var Formula = function () {

}

/**
 * 检测两点之间的距离是否小于某个范围
 *
 * @param origin {Object} origin entity
 * @param target {Object} target entity
 * @param range {Number} the range of distance
 */
Formula.inRange = function (origin, target, range) {
  var dx = origin.x - target.x;
  var dy = origin.y - target.y;
  return dx * dx + dy * dy <= range * range;
};


//两点之间的距离
Formula.distance = function (x1, y1, x2, y2) {
  var dx = x2 - x1;
  var dy = y2 - y1;

  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * 
 * 返回时间格式如下: 2018-8-21 10:24:41
 * 
 * convert the date according to format
 * @param {Object} date
 * @param {String} format
 * @param {String}
 */
Formula.timeFormat = function (date) {
  var n = date.getFullYear();   
  var y = date.getMonth() + 1;
  var r = date.getDate();
  var mytime = date.toLocaleTimeString();
  var mytimes = n + "-" + y + "-" + r + " " + mytime;
  return mytimes;
}

function check(num) {
  return num > 9 ? num : '0' + num;
}

module.exports = {
  id: "formula",
  func: Formula
}