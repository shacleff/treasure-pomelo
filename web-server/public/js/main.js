__resources__["/main.js"] = {
  meta: {
    mimetype: "application/javascript"
  },
  data: function (exports, require, module, __filename, __dirname) {
    //var config = require('config');
    var pomelo = window.pomelo;
    var config = require('config');
    var app = require('app');
    var dataApi = require('dataApi');
    var msgHandler = require('msgHandler');

    function main() {
      uiInit();
    }

    //
    function entry(name, callback) {

      //先初始化socket
      pomelo.init({ host: config.GATE_HOST, port: config.GATE_PORT, log: true }, function () {

        //客户端先连接网关
        pomelo.request('gate.gateHandler.queryEntry', { uid: name }, function (data) {
          pomelo.disconnect();

          if (data.code === 2001) {
            alert('server error!');
            return;
          }
          if (data.host === '127.0.0.1') {
            data.host = location.hostname;
          }
          // console.log(data);

          //连接上网关后，根据服务器返回来的消息，确定了连接上的connector服务器的host和port端口
          pomelo.init({ host: data.host, port: data.port, log: true }, function () {
            if (callback) {
              callback();
            }
          });
        });
      });
    }

    //
    var uiInit = function () {
      var btn = document.querySelector('#login .btn');
      btn.onclick = function () {
        var name = document.querySelector('#login input').value;
        entry(name, function () {

          //加载完动画数据，开始进行下面的初始化绑定session 和 进入场景服务器
          loadAnimation(function () {

            //玩家连接上connector服务器后，第一次向connector服务器发出请求，服务器将session信息进行初始化和绑定
            pomelo.request('connector.entryHandler.entry', { name: name }, function (data) {

              //初始化完session后，开始请求进入场景服务器
              pomelo.request("area.playerHandler.enterScene", { name: name, playerId: data.playerId }, function (data) {

                //
                msgHandler.init();

                //根据服务器返回的消息，初始化场景
                app.init(data.data);

              });
            });
          });
        });
      };
    };

    var jsonLoad = false;

    //得到动画数据
    var loadAnimation = function (callback) {
      if (jsonLoad) {
        if (callback) {
          callback();
        }
        return;
      }

      //请求得到动画数据
      pomelo.request('area.playerHandler.getAnimation', function (result) {
        dataApi.animation.set(result.data);
        jsonLoad = true;
        if (callback) {
          callback();
        }
      });
    };

    //主动调用main函数
    exports.main = main;
  }
};
