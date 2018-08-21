var logger = require('pomelo-logger').getLogger('bearcat-treasures', 'PlayerHandler');
var bearcat = require('bearcat');
var fs = require('fs');

var PlayerHandler = function (app) {
  this.app = app;
  this.consts = null;
  this.areaService = null;
};

/**
 * 玩家进入地图，地图新加一个人
 * 
 * Player enter scene, and response the related information such as
 * playerInfo, areaInfo and mapData to client.
 *
 * @param {Object} msg
 * @param {Object} session
 * @param {Function} next
 * @api public
 */
PlayerHandler.prototype.enterScene = function (msg, session, next) {

  //玩家进入场景，所及分配一个角色信息
  var role = this.dataApiUtil.role().random();

  //
  var player = bearcat.getBean('player', {
    id: msg.playerId,
    name: msg.name,
    kindId: role.id
  });

  player.serverId = session.frontendId;

  //往地图服务添加玩家. 这样经过服务器同步后，所有玩家就可以看到这个新加入的玩家。
  if (!this.areaService.addEntity(player)) {
    logger.error("Add player to area faild! areaId : " + player.areaId);
    next(new Error('fail to add user into area'), {
      route: msg.route,
      code: this.consts.MESSAGE.ERR
    });
    return;
  }

  //添加完玩家后，进行下一步操作
  var r = {
    code: this.consts.MESSAGE.RES,
    data: {
      area: this.areaService.getAreaInfo(),
      playerId: player.id
    }
  };

  //
  next(null, r);
};

/**
 * 动画数据
 * 
 * Get player's animation data.
 *
 * @param {Object} msg
 * @param {Object} session
 * @param {Function} next
 * @api public
 */
var animationData = null;
PlayerHandler.prototype.getAnimation = function (msg, session, next) {

  //同步读取动画数据
  var path = '../../../../config/animation_json/';
  if (!animationData) {
    var dir = './config/animation_json';
    var name, reg = /\.json$/;
    animationData = {};
    fs.readdirSync(dir).forEach(function (file) {
      if (reg.test(file)) {
        name = file.replace(reg, '');
        animationData[name] = require(path + file);
      }
    });
  }

  //传递动画数据
  next(null, {
    code: this.consts.MESSAGE.RES,
    data: animationData
  });
};

/**
 * 客户端请求往某个方向移动
 * 
 * Player moves. Player requests move with the given movePath.
 * Handle the request from client, and response result to client
 *
 * @param {Object} msg
 * @param {Object} session
 * @param {Function} next
 * @api public
 */
PlayerHandler.prototype.move = function (msg, session, next) {

  //客户端请求移动
  var endPos = msg.targetPos;


  var playerId = session.get('playerId');
  var player = this.areaService.getPlayer(playerId);
  if (!player) {
    logger.error('Move without a valid player ! playerId : %j', playerId);
    next(new Error('invalid player:' + playerId), {
      code: this.consts.MESSAGE.ERR
    });
    return;
  }

  //玩家朝哪个实体移动的，去捡金币
  var target = this.areaService.getEntity(msg.target);

  //player的目标设置。 如果此处没有金币，那肯定啥也捡不到。。有金币，就有目标，跑过去捡金币
  player.target = target ? target.entityId : null;

  //移动的跑出地图了，报错. 停止移动
  if (endPos.x > this.areaService.getWidth() || endPos.y > this.areaService.getHeight()) {
    logger.warn('The path is illigle!! The path is: %j', msg.path);
    next(new Error('fail to move for illegal path'), {
      code: this.consts.MESSAGE.ERR
    });

    return;
  }

  //玩家，移动到的最终位置
  var action = bearcat.getBean('move', {
    entity: player,
    endPos: endPos,
  });

  //尝试移动
  if (this.areaService.addAction(action)) {

    //移动成功
    next(null, {
      code: this.consts.MESSAGE.RES,
      sPos: player.getPos()
    });

    //全局广播玩家移动位置
    this.areaService.getChannel().pushMessage({
      route: 'onMove',
      entityId: player.entityId,
      endPos: endPos
    });
  }
};

module.exports = function (app) {
  return bearcat.getBean({
    id: "playerHandler",
    func: PlayerHandler,
    args: [{
      name: "app",
      value: app
    }],
    props: [{
      name: "areaService",
      ref: "areaService"
    }, {
      name: "dataApiUtil",
      ref: "dataApiUtil"
    }, {
      name: "consts",
      ref: "consts"
    }]
  });
};