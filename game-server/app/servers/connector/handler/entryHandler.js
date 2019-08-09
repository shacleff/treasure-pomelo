var Code = require('../../../../../shared/code'); // 引入公共模块
var bearcat = require('bearcat');

var id = 1; // 自增玩家id

var EntryHandler = function (app) {
    this.app = app;
    this.serverId = app.get('serverId').split('-')[2];
};

EntryHandler.prototype.entry = function (msg, session, next) {
    var self = this;
    var playerId = parseInt(this.serverId + id, 10); // 玩家连接上connector后，根据分配的connector，决定playerId
    id += 1;

    session.bind(playerId); // 绑定uid

    session.set('playerId', playerId); // set-->this.settings里面存  key-->value
    session.set('areaId', 1);

    session.on('closed', onUserLeave.bind(null, self.app));
    session.pushAll();

    next(null, {
        code: Code.OK,
        playerId: playerId
    });
};

var onUserLeave = function (app, session, reason) {
    if (session && session.uid) {
        app.rpc.area.playerRemote.playerLeave(session, {
            playerId: session.get('playerId'),
            areaId: session.get('areaId')
        }, null);
    }
};

module.exports = function (app) {
    return bearcat.getBean({
        id: "entryHandler",
        func: EntryHandler,
        args: [{
            name: "app",
            value: app
        }]
    });
};