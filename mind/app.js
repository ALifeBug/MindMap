var createError = require('http-errors');//require加载模块
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
var Mind = require('./models/mind');

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
        var toName = data.to;//被邀请者的名字
        var toId;//被邀请者的socket id
        var arr = data.url.split('=');
        var roomid = arr[arr.length-1];//以mind的id作为房间名
        if(!room[roomid]) {            //如果房间不存在，则创建房间，并将邀请者加入房间
            room[roomid] = [];
            room[roomid].push(data.from);
        }
        if(toId = hashName[toName]){
            io.to(toId).emit('invited',{'from':data.from,'url':data.url,'roomid':roomid,'to':data.to});
        }
        io.to(socket.id).emit('invitesuccess');
        console.log(data.from+" to "+data.to);
    });

    socket.on('join',function (data) {
        var id = data.roomid;//新加入者传来的房间id
        var inRoom = false;//是否已经在小组内
        var arr = room[id];
        for(var i=0;i<arr.length;i++){ //通过遍历小组成员判断
            if(arr[i]===data.name){
               inRoom=true;
            }
        }
        if(!inRoom){ //如果不在小组
            room[id].push(data.name);//加入小组
            io.to(socket.id).emit('joinsuccess');
            socket.to(id).emit('sys',{'msg':'join','name':data.name,'team':room[id]}); //广播新增成员的消息
        }
    });

    //由于socket是不断断开与连接的，所以添加重新加入的函数
    socket.on('rejoin',function (data) {
        var id = data.roomid;
        var inroom = false;
        if(room[id]!=undefined){//查询该用户是否在小组里
            var arr = room[id];
            for(var i=0;i<arr.length;i++){
              if(arr[i]===data.name){
                  socket.join(id);
                  inroom=true;
              }
            }
        }

        //返回该思维导图是否是该用户所有
        var own=false;
        Mind.getOne({"_id":id},function (err,mind) {
            if(err){
                console.log(err);
            }else{
                if(mind.editor===data.name)
                    own=true;
                var toId = data.socketid;
                io.to(toId).emit('inOrnot',{'in':inroom,'own':own,'team':room[id]});
            }
        });

    });

    socket.on('leave',function (data) {
        var roomID = data.id;
        var user = data.user;
        var index = room[roomID].indexOf(user);
        if (index !== -1) {
            room[roomID].splice(index, 1);
        }
        socket.leave(roomID);    // 退出房间

        if(room[roomID].length===0){ //如果当前房间里已经没人了，则要删除该房间
            delete room[roomID];
            console.log('房间被删除');
        }else { //如果还有组员，则需要广播该组员离开的消息
            socket.to(roomID).emit('sys', {'msg': 'leave', 'name': user, 'team': room[roomID]});
        }
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
