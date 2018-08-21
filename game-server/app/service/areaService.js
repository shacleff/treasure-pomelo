var logger = require('pomelo-logger').getLogger('bearcat-treasures', 'AreaService');
var EventEmitter = require('events').EventEmitter;
var bearcat = require('bearcat');
var pomelo = require('pomelo');

var AreaService = function () {
  this.id = 0;
  this.width = 0;
  this.height = 0;
  this.tickCount = 0; // player score rank
  this.treasureCount = 0;
  this.added = []; // the added entities in one tick
  this.reduced = []; // the reduced entities in one tick
  this.players = {};
  this.entities = {};
  this.channel = null;
  this.actionManagerService = null;
  this.consts = null;
}

/**
 * Init areas
 * @param {Object} opts
 * @api public
 */
AreaService.prototype.init = function (opts) {
  this.id = opts.id;
  this.width = opts.width;
  this.height = opts.height;

  //初始化地图，在地图上生成40个宝物
  this.generateTreasures(40);

  //area run
  this.run();
};

//开启地图更新
AreaService.prototype.run = function () {
  setInterval(this.tick.bind(this), 100);
}

//每间隔0.1s进行玩家实体更新、排行榜更新
AreaService.prototype.tick = function () {

  //更新玩家的动作序列帧
  //run all the action
  this.actionManagerService.update();

  //
  this.entityUpdate();

  //
  this.rankUpdate();
}

//添加一个动作
AreaService.prototype.addAction = function (action) {
  return this.actionManager().addAction(action);
}

//
AreaService.prototype.abortAction = function (type, id) {
  return this.actionManager().abortAction(type, id);
}

//
AreaService.prototype.abortAllAction = function (id) {
  return this.actionManager().abortAllAction(id);
}

//得到某个地图中的channel，相当于一个服
AreaService.prototype.getChannel = function () {
  if (this.channel) {
    return this.channel;
  }

  this.channel = pomelo.app.get('channelService').getChannel('area_' + this.id, true);
  return this.channel;
};

//为玩家添加捡宝物事件
AreaService.prototype.addEvent = function (player) {

  //
  var self = this;

  //玩家捡起宝物
  player.on('pickItem', function (args) {

    //
    var player = self.getEntity(args.entityId);

    //宝物
    var treasure = self.getEntity(args.target);


    player.target = null;

    //捡到宝物
    if (treasure) {

      //服务器先做数据处理

      //1.玩家分数增加
      player.addScore(treasure.score);

      //移除掉宝物
      self.removeEntity(args.target);

      //广播捡到了宝物。。广播后，客户端收到信息，进行地图更新之类的
      self.getChannel().pushMessage({
        route: 'onPickItem',
        entityId: args.entityId,
        target: args.target,
        score: treasure.score
      });
    }
  });
}

AreaService.prototype.entityUpdate = function () {

  //向客户端广播去掉一帧内应该去掉的实体对象
  if (this.reduced.length > 0) {
    this.getChannel().pushMessage({
      route: 'removeEntities',
      entities: this.reduced
    });

    //
    this.reduced = [];
  }

  //
  if (this.added.length > 0) {
    var added = this.added;
    var r = [];
    for (var i = 0; i < added.length; i++) {
      r.push(added[i].toJSON());
    }

    //广播新增的实体对象
    this.getChannel().pushMessage({
      route: 'addEntities',
      entities: r
    });

    this.added = [];
  }
};
/**
 * Add entity to area
 * @param {Object} e Entity to add to the area.
 */
AreaService.prototype.addEntity = function (e) {
  if (!e || !e.entityId) {
    return false;
  }

  //key：实体id   value：具体的对象
  this.entities[e.entityId] = e;

  //判断，如果增加的是玩家的话
  if (e.type === this.consts.EntityType.PLAYER) {

    //channel里面增加一个玩家，参数是：玩家id + 服务器id
    this.getChannel().add(e.id, e.serverId);

    //
    this.addEvent(e);

    //同一个玩家添加了2次，报错提醒
    if (!!this.players[e.id]) {
      logger.error('add player twice! player : %j', e);
    }

    //玩家数组中记录下这个玩家实体id
    this.players[e.id] = e.entityId;
  } 
  //添加的是宝物的话，地图上宝物数量+1
  else if (e.type === this.consts.EntityType.TREASURE) {
    this.treasureCount++;
  }

  //不加区分的数组里面记录下这个实体
  this.added.push(e);

  return true;
};

/**
 * 排名
 */
AreaService.prototype.rankUpdate = function () {

  //时钟累计
  this.tickCount++;

  //超过10个时钟，从新进行排名计算
  if (this.tickCount >= 10) {

    //
    this.tickCount = 0;

    //玩家都是添加到地图中的，从地图中得到所有玩家
    var player = this.getAllPlayers();

    //根据分数排名
    player.sort(function (a, b) {
      return a.score < b.score;
    });

    //取得前10名
    var ids = player.slice(0, 10).map(function (a) {
      return a.entityId;
    });

    //广播最新的排名消息
    this.getChannel().pushMessage({
      route: 'rankUpdate',
      entities: ids
    });
  }
};

/**
 * Remove Entity form area
 * @param {Number} entityId The entityId to remove
 * @return {boolean} remove result
 */
AreaService.prototype.removeEntity = function (entityId) {
  var e = this.entities[entityId];
  if (!e) {
    return true;
  }

  if (e.type === this.consts.EntityType.PLAYER) {

    //玩家离线了，则让玩家离开通道
    this.getChannel().leave(e.id, e.serverId);

    //终止掉玩家的动作
    this.actionManagerService.abortAllAction(entityId);

    //玩家离开了，玩家map中删除玩家信息
    delete this.players[e.id];

  } else if (e.type === this.consts.EntityType.TREASURE) {

    this.treasureCount--;

    //宝物少于25个，立马再生成15个
    if (this.treasureCount < 25) {
      this.generateTreasures(15);
    }
  }

  delete this.entities[entityId];


  this.reduced.push(entityId);
  return true;
};

/**
 * Get entity from area
 * @param {Number} entityId.
 */
AreaService.prototype.getEntity = function (entityId) {
  return this.entities[entityId];
};

/**
 * id列表转化为实体列表
 * Get entities by given id list
 * @param {Array} The given entities' list.
 */
AreaService.prototype.getEntities = function (ids) {
  var result = [];
  for (var i = 0; i < ids.length; i++) {
    var entity = this.entities[ids[i]];
    if (entity) {
      result.push(entity);
    }
  }

  return result;
};

//玩家也属于实体的一部分.根据玩家id，得到实体列表
AreaService.prototype.getAllPlayers = function () {
  var _players = [];
  var players = this.players;
  for (var id in players) {
    _players.push(this.entities[players[id]]);
  }

  return _players;
};

//生成n个宝物
AreaService.prototype.generateTreasures = function (n) {
  if (!n) {
    return;
  }

  for (var i = 0; i < n; i++) {
    var d = this.dataApiUtil.treasure().random();

    //可以看出来，生成的宝物，不包含坐标信息
    var t = bearcat.getBean('treasure', {
      kindId: d.id,
      kindName: d.name,
      imgId: d.imgId,
      score: parseInt(d.heroLevel, 10)
    });

    this.addEntity(t);
  }
};

/**
 * 实体数据
 */
AreaService.prototype.getAllEntities = function () {
  var r = {};
  var entities = this.entities;

  for (var id in entities) {
    r[id] = entities[id].toJSON();
  }

  return r;
  // return this.entities;
};

//通过playerId得到玩家实体
AreaService.prototype.getPlayer = function (playerId) {
  var entityId = this.players[playerId];
  return this.entities[entityId];
};

//移除一个玩家
AreaService.prototype.removePlayer = function (playerId) {
  var entityId = this.players[playerId];

  if (entityId) {
    delete this.players[playerId];
    this.removeEntity(entityId);
  }
};

/**
 * 得到地图信息
 * Get area entities for given postion and range.
 */
AreaService.prototype.getAreaInfo = function () {
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
}