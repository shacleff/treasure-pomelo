var util = require('util');

var Utils = function () {

};

Utils.prototype.invokeCallback = function (cb) {
    if (!!cb && typeof cb == 'function') {
        cb.apply(null, Array.prototype.slice.call(arguments, 1));
    }
};

Utils.prototype.rand = function (min, max) { //generate a random number between min and max
    var n = max - min;
    return min + Math.round(Math.random() * n);
};

Utils.prototype.clone = function (o) { // clone a object
    var n = {};
    for (var k in o) {
        n[k] = o[k];
    }
    return n;
};

module.exports = {
    id: "utils",
    func: Utils
};