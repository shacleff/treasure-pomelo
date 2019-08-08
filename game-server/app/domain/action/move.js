var logger = require('pomelo-logger').getLogger('bearcat-treasures', 'Move');
var bearcat = require('bearcat');
var util = require('util');

// Move action, which is used to preserve and update user position
var Move = function (opts) {
    this.opts = opts;
    opts.type = 'move';
    opts.id = opts.entity.entityId;
    opts.singleton = true;

    this.time = Date.now();
    this.entity = opts.entity;
    this.endPos = opts.endPos;
};

Move.prototype.init = function () {
    var Action = bearcat.getFunction('action');
    Action.call(this, this.opts); // Move继承于Action
};

Move.prototype.update = function () { // player移动一次
    var time = Date.now() - this.time; // 距离上次移动多久
    var speed = this.entity.walkSpeed; //实体移动速度
    var moveLength = speed * time / 1000; //移动长度等于 速度 * 时间(s)
    var dis = getDis(this.entity.getPos(), this.endPos); //实体当前位置 和 重点位置差

    if (dis <= moveLength / 2) {
        this.finished = true;
        this.entity.setPos(this.endPos.x, this.endPos.y);
        return;
    } else if (dis < 55 && this.entity.target) { //距离目的距离很小，则捡到了宝物
        this.entity.emit('pickItem', { // 这样直接发射事件...怕是只能在一个服务器上吧
            entityId: this.entity.entityId,
            target: this.entity.target
        });
    }

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