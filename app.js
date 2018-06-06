var createError = require('http-errors');//require加载模块
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
var _ = require('underscore');

var index = require('./routes/index');//加载路由模块
var mind = require('./routes/mind');
var settings = require('./settings');
var flash = require('connect-flash');
var app = express(),//生成一个express实例app
    server = app.listen(3006,function () {
        console.log('Express server listening on port ' + 3006);//http
    }),
    io = require('socket.io').listen(server);//引入socket.io



// view engine setup
app.set('views', path.join(__dirname, 'views'));//设置views文件夹为存放视图文件的目录,即存放模板文件的地方
app.set('view engine', 'ejs');//设置模板引擎为ejs
app.use(flash());
app.use(logger('dev'));//加载日志中间件
app.use(express.json());//加载解析json的中间件
app.use(express.urlencoded({ extended: false }));//加载解析urlencoded
app.use(cookieParser());//加载解析cookie的中间件
app.use(express.static(path.join(__dirname, 'public')));//设置public文件夹为存放静态文件的目录

app.use(session({
    secret:settings.cookieSecret,
    cookie:{maxAge:1000*60*60*24*30},//30 days
    saveUninitialized:true,
    resave:true,
    store:new MongoStore({
        db:settings.db,
        host:settings.host,
        port:settings.port
    })
}));

var hashName=new Array();
var room={};
io.on('connection',function (socket) {

    socket.on('setName',function (data) {
        hashName[data] = socket.id;
    });

    socket.on('invite',function (data) {
        var toName = data.to;
        var toId;
        var arr = data.url.split('=');
        var roomid = arr[arr.length-1];//以mind的id作为房间名
        socket.join(roomid);
        if(!room[roomid]) {
            room[roomid] = [];
            room[roomid].push(data.from);
        }
        if(toId = hashName[toName]){
            io.to(toId).emit('invited',{'from':data.from,'url':data.url,'roomid':roomid,'to':data.to});
        }
    });

    socket.on('join',function (data) {
        var id = data.roomid;
        var inRoom = false;
        var arr = room[id];
        for(var i=0;i<arr.length;i++){
            if(arr[i]===data.name){
               inRoom=true;
            }
        }
        if(!inRoom){
            room[id].push(data.name);
            socket.join(data.roomid);
        }
    });

    socket.on('rejoin',function (data) {
        var id = data.roomid;
        var inroom = false;
        if(room[id]!=undefined){
            var arr = room[id];
            for(var i=0;i<arr.length;i++){
              if(arr[i]===data.name){
                  socket.join(id);
                  inroom=true;
              }
            }
        }
        var toId = data.socketid;
        console.log(data.socketid);
        io.to(toId).emit('inOrnot',{'in':inroom});
    });

    socket.on('leave',function (data) {
        var roomID = data.id;
        var user = data.user;
        var index = room[roomID].indexOf(user);
        if (index !== -1) {
            room[roomID].splice(index, 1);
        }
        socket.leave(roomID);    // 退出房间
    });

    socket.on('message',function (msg) {
        socket.to(msg.roomid).emit('new message',msg.syncmsg);
    })
});


index(app);
mind(app);



// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});


module.exports = app;//导出app实例供其他模块调用
