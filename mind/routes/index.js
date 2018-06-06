//引入模块
var User = require('../models/user');
var sendEmail = require('../models/email');
var crypto = require('crypto');


function checkLogin(req,res,next){
    if(!req.session.user){
        req.flash('error','未登录!');
        return res.redirect('/login');
    }
    return next();
}

function checkNotLogin(req,res,next){
    if(req.session.user){
        req.flash('error','已登录!');
        return res.redirect('back');
    }
    return next();
}

module.exports = function(app){

  app.get('/',function(req, res) {
      res.render('index', {
          title: '首页',
          user:req.session.user
      });
  });

    app.post('/checkname',function (req,res) {
        User.get({'name':req.body.name},function (err,user) {
            if(err){
                return res.redirect('/');
            }
            if(user){
                res.send({status:"success",result:"reged"});
            }else{
                res.send({status:"success",result:"notReged"});
            }
        })
    });

  app.post('/checkemail',function (req,res) {
     User.get({'email':req.body.email},function (err,user) {
         if(err){
             return res.redirect('/');
         }
         if(user){
           res.send({status:"success",result:"reged"});
         }else{
           res.send({status:"success",result:"notReged"});
         }
     })
  });

  app.get('/reg',checkNotLogin);
  app.get('/reg',function (req,res) {
      res.render('reg', {
          title:'注册',
          user:req.session.user
      });
  });

  app.post('/reg',checkNotLogin);
  app.post('/reg',function (req,res) {
      var name = req.body.name,
          password = req.body.password,
          email = req.body.email;
      //生成密码的md5值
      var md5 = crypto.createHash('md5');
      password = md5.update(password).digest('hex');
      var newUser = new User({
          name:name,
          password:password,
          email:email
      });

          //若不存在则新增用户
      newUser.save(function (err,user) {
              if(err){
                  req.flash('error',err);
                  return res.redirect('/reg');
              }
              req.session.user = user;
              //发送邮件
              var mindEmail = {
                  from:'"mind" <18811503658@163.com>',//发件人
                  subject:'mind 注册',//主题
                  to:email,//收件人
                  text:'恭喜您,mind 注册成功！这是您的一小步,却是我们全体工作人员的一大步!祝您使用愉快!'//邮件内容,html格式
              };
              sendEmail(mindEmail);
              res.redirect('/');
      });
  });

  app.get('/login',checkNotLogin);
  app.get('/login',function (req,res) {
      res.render('login',{
          title:'登录',
          user:req.session.user
      });
  });

  app.post('/login',checkNotLogin);
  app.post('/login',function (req,res) {
      console.log(req.body.email+" "+req.body.password);
      var password = req.body.password;
      //生成密码的md5值
      var md5 = crypto.createHash('md5');
      password = md5.update(password).digest('hex');
      //检查用户是否存在
      User.get({'email':req.body.email},function (err,user) {
          //检查密码是否一致
          if(user.password != password){
              res.send({status:"success",result:"false"});
          }else {
              //验证成功,存入session
              req.session.user = user;
              res.send({status:"success",user:user.name});
          }
      })
  });

  app.get('/logout',checkLogin);
  app.get('/logout',function (req,res) {
      req.session.user = null;
      res.redirect('/');
  });

  app.post('/username',function (req,res) {
      if(req.session.user){
          res.send({'name':req.session.user.name});
      }
  })

};


