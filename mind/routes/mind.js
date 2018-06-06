var Mind = require('../models/mind');


module.exports=function (app) {

    function checkLogin(req,res,next){
        if(!req.session.user){
            req.flash('error','未登录!');
            return res.redirect('/login');
        }
        return next();
    }

    app.post('/mind/new',checkLogin);
    app.post('/mind/new',function (req,res) {
        var data = [{"key":0, "figure":"Ellipse","dir":"bottom", "text":"未命名主题", "loc":"0 0", "color":"#fff","font": "17pt Microsoft Yahei"}];
        var newMind = new Mind(req.body.title,req.session.user.name,data);
        newMind.save(function (err,mind) {
            if(err){
                req.flash('error');
                return res.render('error');
            }
            res.send({'title':'mind','mindid':mind._id})
        });
    });

    app.get('/mind/load',checkLogin);
    app.get('/mind/load',function (req,res) {
            res.render('mindmap',{
                title:'mind',
                user:req.session.user
            });
    });

    app.post('/mind/load',checkLogin);
    app.post('/mind/load',function (req,res) {
        Mind.getOne({"_id":req.body.id},function (err,mind) {
            if(err){
                console.log(err);
            }else{
                res.send({
                    mymind:JSON.stringify(mind.data),
                });
            }
        });
    });

    app.post('/mind/files',checkLogin);
    app.get('/mind/files',function (req,res) {
        Mind.get({"editor":req.session.user.name},function (err,minds) {
            if(err){
                console.log(err);
            }else{
                res.render('file',{
                    user:req.session.user,
                    title:'我的文件',
                    minds:minds
                })
            }
        })
    });

    app.post('/mind/save',checkLogin);
    app.post('/mind/save',function (req,res) {
        var data = JSON.parse(req.body.newData);
        Mind.update(req.body.id,data,function (err,mind) {
            if(err){
                console.log(err);
            }else {
                res.send({
                    status: "success"
                })
            }
        })
    });

    app.post('/mind/remove',checkLogin);
    app.get('/mind/remove',function (req,res) {
        Mind.remove({'_id':req.query.id},function (error) {
            if(error){
                console.log(error);
            }else{
                res.redirect('/mind/files');
            }
        })
    });

    app.post('/mind/invite',checkLogin);
    app.post('/mind/invite',function (req,res) {
        console.log(req.body.id);
        res.send({'status':'success'});
    });


};