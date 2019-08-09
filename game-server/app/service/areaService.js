var logger = require('pomelo-logger').getLogger('bearcat-treasures', 'AreaService');
var EventEmitter = require('events').EventEmitter;
var bearcat = require('bearcat');
var pomelo = require('pomelo');

var AreaService = function () { // 相当于桌子对象，桌子里面除了channel，还有players等
    this.id = 0;
    this.width = 0;
    this.height = 0;
    this.tickCount = 0;
    this.treasureCount = 0;
    this.added = [];
    this.reduced = [];
    this.players = {}; // 玩家id列表,控件换时间
    this.entities = {}; // 所有实体列表(包括了玩家 + 宝物)
    this.channel = null; // AreaService就类似于一个桌子一样，channel只是一个普通属性
    this.actionManagerService = null;
    this.consts = null;
};

AreaService.prototype.init = function (opts) {
    this.id = opts.id;
    this.width = opts.width;
    this.height = opts.height;
    this.generateTreasures(40); //初始化地图，在地图上生成40个宝物
    this.run(); // 区域服务跑起来
};

AreaService.prototype.run = function () {
    setInterval(this.tick.bind(this), 100); // 世界运行起来, 0.1s更新一次
};

AreaService.prototype.tick = function () {
    this.actionManagerService.update();
    this.entityUpdate(); // 实体更新
    this.rankUpdate(); // 排行榜更新
};

AreaService.prototype.addAction = function (action) {
    return this.actionManager().addAction(action);
};

AreaService.prototype.abortAction = function (type, id) {
    return this.actionManager().abortAction(type, id);
};

AreaService.prototype.abortAllAction = function (id) {
    return this.actionManager().abortAllAction(id);
};

AreaService.prototype.getChannel = function () { // 得到某个地图中的channel，相当于一个桌子
    if (this.channel) {
        return this.channel;
    }

    this.channel = pomelo.app.get('channelService').getChannel('area_' + this.id, true);
    return this.channel;
};

AreaService.prototype.addEvent = function (player) { //为玩家添加捡宝物事件
    var self = this;

    player.on('pickItem', function (args) { //玩家捡起宝物
        var player = self.getEntity(args.entityId);
        var treasure = self.getEntity(args.target); //宝物
        player.target = null;
        if (treasure) { //捡到宝物
            player.addScore(treasure.score); // 玩家分数增加
            self.removeEntity(args.target); // 移除掉宝物

            self.getChannel().pushMessage({ // 给所有地图玩家广播捡到了宝物,广播后，客户端收到信息，进行地图更新之类的
                route: 'onPickItem',
                entityId: args.entityId,
                target: args.target,
                score: treasure.score
            });
        }
    });
};

AreaService.prototype.entityUpdate = function () { // 向客户端广播去掉一次tick内 `去掉的` `新增的` 实体对象
    if (this.reduced.length > 0) {
        this.getChannel().pushMessage({
            route: 'removeEntities',
            entities: this.reduced
        });

        this.reduced = [];
    }

    if (this.added.length > 0) {
        var added = this.added;
        var r = [];
        for (var i = 0; i < added.length; i++) {
            r.push(added[i].toJSON());
        }

        this.getChannel().pushMessage({
            route: 'addEntities',
            entities: r
        });

        this.added = [];
    }
};

AreaService.prototype.addEntity = function (e) { // 添加实体到场景
    if (!e || !e.entityId) {
        return false;
    }

    this.entities[e.entityId] = e;

    if (e.type === this.consts.EntityType.PLAYER) {
        this.getChannel().add(e.id, e.serverId); //channel里面增加一个玩家，参数是：玩家id + 服务器id

        this.addEvent(e); // 为玩家添加捡包事件

        if (!!this.players[e.id]) { //同一个玩家添加了2次，报错提醒
            logger.error('add player twice! player : %j', e);
        }

        this.players[e.id] = e.entityId;  //玩家数组中记录下这个玩家实体id
    } else if (e.type === this.consts.EntityType.TREASURE) { //添加的是宝物的话，地图上宝物数量+1
        this.treasureCount++;
    }

    this.added.push(e); //不加区分的数组里面记录下这个实体， 毕竟他们都是继承于Entity

    return true;
};

AreaService.prototype.rankUpdate = function () {
    this.tickCount++; //时钟累计
    if (this.tickCount >= 10) { //超过10个时钟，从新进行排名计算
        this.tickCount = 0;
        var player = this.getAllPlayers(); //玩家都是添加到地图中的，从地图中得到所有玩家

        player.sort(function (a, b) { // 根据分数排名
            return a.score < b.score;
        });

        var ids = player.slice(0, 10).map(function (a) { // 取得前10名
            return a.entityId;
        });

        this.getChannel().pushMessage({ // 广播最新的排名消息
            route: 'rankUpdate',
            entities: ids
        });
    }
};

AreaService.prototype.removeEntity = function (entityId) {
    var e = this.entities[entityId];
    if (!e) {
        return true;
    }

    if (e.type === this.consts.EntityType.PLAYER) {
        this.getChannel().leave(e.id, e.serverId);
        this.actionManagerService.abortAllAction(entityId);
        delete this.players[e.id];
    } else if (e.type === this.consts.EntityType.TREASURE) {
        this.treasureCount--;
        if (this.treasureCount < 25) {
            this.generateTreasures(15);
        }
    }

    delete this.entities[entityId];

    this.reduced.push(entityId);
    return true;
};

AreaService.prototype.getEntity = function (entityId) {
    return this.entities[entityId];
};

AreaService.prototype.getEntities = function (ids) { // id列表-->实体列表
    var result = [];
    for (var i = 0; i < ids.length; i++) {
        var entity = this.entities[ids[i]];
        if (entity) {
            result.push(entity);
        }
    }
    return result;
};

AreaService.prototype.getAllPlayers = function () { // 得到玩家实体列表
    var _players = [];
    var players = this.players;
    for (var id in players) {
        _players.push(this.entities[players[id]]);
    }

    return _players;
};

AreaService.prototype.generateTreasures = function (n) { // 生成n个宝物
    if (!n) {
        return;
    }

    for (var i = 0; i < n; i++) {
        var d = this.dataApiUtil.treasure().random();
        var t = bearcat.getBean('treasure', { // 可以看出来，生成的宝物，不包含坐标信息
            kindId: d.id,
            kindName: d.name,
            imgId: d.imgId,
            score: parseInt(d.heroLevel, 10)
        });

        this.addEntity(t);
    }
};

AreaService.prototype.getAllEntities = function () { // 实体数据
    var r = {};
    var entities = this.entities;

    for (var id in entities) {
        r[id] = entities[id].toJSON();
    }

    return r;
};

AreaService.prototype.getPlayer = function (playerId) { //通过playerId得到玩家实体
    var entityId = this.players[playerId];
    return this.entities[entityId];
};

AreaService.prototype.removePlayer = function (playerId) { // 移除一个玩家
    var entityId = this.players[playerId];

    if (entityId) {
        delete this.players[playerId];
        this.removeEntity(entityId);
    }
};

AreaService.prototype.getAreaInfo = function () { // 得到地图信息
    var entities = this.getAllEntities();
    return {
        id: this.id,
        entities: entities,
        width: this.width,
        height: this.height
    };
};

AreaService.prototype.getWidth = function () {
    return this.width;
};

AreaService.prototype.getHeight = function () {
    return this.height;
};

AreaService.prototype.entities = function () {
    return this.entities;
};

AreaService.prototype.actionManager = function () {
    return this.actionManagerService;
};

module.exports = {
    id: "areaService",
    func: AreaService,
    props: [{
        name: "actionManagerService",
        ref: "actionManagerService"
    }, {
        name: "dataApiUtil",
        ref: "dataApiUtil"
    }, {
        name: "consts",
        ref: "consts"
    }]
};