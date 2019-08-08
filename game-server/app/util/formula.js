var logger = require('pomelo-logger').getLogger('bearcat-treasures', 'Formula');

var Formula = function () {

};

Formula.inRange = function (origin, target, range) { // 检测两点之间的距离是否小于某个范围
    var dx = origin.x - target.x;
    var dy = origin.y - target.y;
    return dx * dx + dy * dy <= range * range;
};

Formula.distance = function (x1, y1, x2, y2) { // 两点之间的距离
    var dx = x2 - x1;
    var dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
};

Formula.timeFormat = function (date) { // 返回时间格式如下: 2018-8-21 10:24:41
    var n = date.getFullYear();
    var y = date.getMonth() + 1;
    var r = date.getDate();
    var mytime = date.toLocaleTimeString();
    var mytimes = n + "-" + y + "-" + r + " " + mytime;
    return mytimes;
};

function check(num) {
    return num > 9 ? num : '0' + num;
}

module.exports = {
    id: "formula",
    func: Formula
}