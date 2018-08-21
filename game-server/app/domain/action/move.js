var logger = require('pomelo-logger').getLogger('bearcat-treasures', 'Move');
var bearcat = require('bearcat');
var util = require('util');

// Move action, which is used to preserve and update user position
var Move = function(opts) {
  this.opts = opts;
  opts.type = 'move';
  opts.id = opts.entity.entityId;
  opts.singleton = true;

  this.time = Date.now();
  this.entity = opts.entity;
  this.endPos = opts.endPos;
};

Move.prototype.init = function() {
  var Action = bearcat.getFunction('action');

  //相当于简单继承，把父类属性拿过来
  Action.call(this, this.opts);
}

//更新一次.
//到底移动是
Move.prototype.update = function() {
  //移动了多长时间(当前时间 - 初始化这个动作时的时间)
  var time = Date.now() - this.time;

  //实体移动速度
  var speed = this.entity.walkSpeed;

  //移动长度等于 速度 * 时间(s)
  var moveLength = speed * time / 1000;

  //实体当前位置 和 重点位置差
  var dis = getDis(this.entity.getPos(), this.endPos);

  //
  if (dis <= moveLength / 2) {

    this.finished = true;
    this.entity.setPos(this.endPos.x, this.endPos.y);
    return;

  } else if (dis < 55 && this.entity.target) {

    //距离目的距离很小，则捡到了宝物
    this.entity.emit('pickItem', {
      entityId: this.entity.entityId,
      target: this.entity.target
    });
  }

  //
  var curPos = getPos(this.entity.getPos(), this.endPos, moveLength, dis);
  this.entity.setPos(curPos.x, curPos.y);

  this.time = Date.now();
};

function getDis(pos1, pos2) {
  return Math.sqrt(Math.pow((pos1.x - pos2.x), 2) + Math.pow((pos1.y - pos2.y), 2));
}

function getPos(start, end, moveLength, dis) {
  if (!dis) {
    dis = getDis(start, end);
  }
  var pos = {};

  pos.x = start.x + (end.x - start.x) * (moveLength / dis);
  pos.y = start.y + (end.y - start.y) * (moveLength / dis);

  return pos;
}

module.exports = {
  id: "move",
  func: Move,
  args: [{
    name: "opts",
    type: "Object"
  }],
  scope: "prototype",
  parent: "action",
  init: "init"
};