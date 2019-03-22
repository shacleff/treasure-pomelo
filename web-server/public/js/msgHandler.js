__resources__["/msgHandler.js"] = {
  meta: {
    mimetype: "application/javascript"
  },
  data: function(exports, require, module, __filename, __dirname) {

    var pomelo = window.pomelo;
    var app = require('app');
    var EntityType = require('consts').EntityType;

    exports.init = init;

    function init() {
      // add entities
      pomelo.on('addEntities', function(data) {
        var entities = data.entities;
        var area = app.getCurArea();
        if (!area) {
          return;
        }
        for (var i = 0; i < entities.length; i++) {
          var entity = area.getEntity(entities[i].entityId);
          if (!entity) {
            area.addEntity(entities[i]);
          }
        }
      });

      //Handle remove entities message
      pomelo.on('removeEntities', function(data) {
        var entities = data.entities;
        var area = app.getCurArea();
        var player = area.getCurPlayer();
        for (var i = 0; i < entities.length; i++) {
          if (entities[i] != player.entityId) {
            area.removeEntity(entities[i]);
          } else {
            console.log('entities[i], player.entityId', entities[i], player.entityId);
            console.error('remove current player!');
          }
        }
      });

      pomelo.on('onMove', function(data) {                                          // 客户端收到服务器推送的移动结果
        var path = data.path;
        var entity = app.getCurArea().getEntity(data.entityId);
        if (!entity) {
          console.error('no character exist for move!' + data.entityId);
          return;
        }

        var sprite = entity.getSprite();
        var sPos = sprite.getPosition();
        sprite.movePath([sPos, data.endPos]);
      });

      // Handle remove item message
      pomelo.on('onRemoveItem', function(data) {
        app.getCurArea().removeEntity(data.entityId);
      });

      pomelo.on('onPickItem', function(data) {                                       // 捡到宝贝
        var area = app.getCurArea();
        var player = area.getEntity(data.entityId);
        var item = area.getEntity(data.target);
        player.set('score', player.score + data.score);
        player.getSprite().scoreFly(data.score);
        player.getSprite().updateName(player.name + ' - ' + player.score);
        area.removeEntity(item.entityId);
      });

      pomelo.on('rankUpdate', function(data) {                                       // 排名更新
        var ul = document.querySelector('#rank ul');
        var area = app.getCurArea();
        var li = "";
        data.entities.forEach(function(id) {
          var e = area.getEntity(id);
          if (e) {
            li += '<li><span>' + e.name + '</span><span>' + e.score + '</span></li>';
          }
        });
        ul.innerHTML = li;
      });

      pomelo.on('onKick', function() {                                               // 被踢
        console.log('You have been kicked offline for the same account logined in other place.');
        app.changeView("login");
      });


      pomelo.on('disconnect', function(reason) {                                     // 断开连接
        app.changeView("login");
      });

      // Handle user leave message, occours when players leave the area
      pomelo.on('onUserLeave', function(data) {
        var area = app.getCurArea();
        var playerId = data.playerId;
        console.log('onUserLeave invoke!');
        area.removePlayer(playerId);
      });

    };
  }
};