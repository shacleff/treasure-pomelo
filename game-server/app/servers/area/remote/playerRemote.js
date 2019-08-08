var bearcat = require('bearcat');

var PlayerRemote = function (app) {
    this.app = app;
    this.utils = null;
    this.consts = null;
    this.areaService = null;
}

PlayerRemote.prototype.playerLeave = function (args, cb) {
    var areaId = args.areaId;     // 哪个玩家离开哪个地图根据id标识
    var playerId = args.playerId;
    var player = this.areaService.getPlayer(playerId);

    if (!player) {
        this.utils.invokeCallback(cb);
        return;
    }

    this.areaService.removePlayer(playerId);     // 离开后进行清理
    this.areaService.getChannel().pushMessage({
        route: 'onUserLeave',
        code: this.consts.MESSAGE.RES,
        playerId: playerId
    });

    this.utils.invokeCallback(cb);
};

module.exports = function (app) {
    return bearcat.getBean({
        id: "playerRemote",
        func: PlayerRemote,
        args: [{
            name: "app",
            value: app
        }],
        props: [{
            name: "areaService",
            ref: "areaService"
        }, {
            name: "utils",
            ref: "utils"
        }, {
            name: "consts",
            ref: "consts"
        }]
    });
};