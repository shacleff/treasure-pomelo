// require json files
var area = require('../../config/data/area');
var role = require('../../config/data/role');
var treasure = require('../../config/data/treasure');

var DataApi = function (data) {
    var fields = {};

    data[1].forEach(function (i, k) {
        fields[i] = k;
    });

    data.splice(0, 2);

    var result = {}
    var ids = [];
    var item;

    data.forEach(function (k) {
        item = mapData(fields, k);
        result[item.id] = item;
        ids.push(item.id);
    });

    this.data = result;
    this.ids = ids;
};

var mapData = function (fields, item) { // array data-->object
    var obj = {};
    for (var k in fields) {
        obj[k] = item[fields[k]];
    }
    return obj;
};

DataApi.prototype.findBy = function (attr, value) { // attr-->items
    var result = [];
    var i, item;
    for (i in this.data) {
        item = this.data[i];
        if (item[attr] == value) {
            result.push(item);
        }
    }
    return result;
};

DataApi.prototype.findById = function (id) { //id-->item
    return this.data[id];
};

DataApi.prototype.random = function () {
    var length = this.ids.length;
    var rid = this.ids[Math.floor(Math.random() * length)];
    return this.data[rid];
};

DataApi.prototype.all = function () { // all item
    return this.data;
};

var DataApiUtil = function () {
    this.areaData = null;
    this.roleData = null;
    this.treasureData = null;
};

DataApiUtil.prototype.area = function () {
    if (this.areaData) {
        return this.areaData;
    }

    this.areaData = new DataApi(area);
    return this.areaData;
};

DataApiUtil.prototype.role = function () {
    if (this.roleData) {
        return this.roleData;
    }

    this.roleData = new DataApi(role);
    return this.roleData;
};

DataApiUtil.prototype.treasure = function () {
    if (this.treasureData) {
        return this.treasureData;
    }

    this.treasureData = new DataApi(treasure);
    return this.treasureData;
};

module.exports = {
    id: "dataApiUtil",
    func: DataApiUtil
};