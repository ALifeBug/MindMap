var mongoose = require('./db');

function Mind(title,editor,data) {
    this.title = title;
    this.editor = editor;
    this.data = data
}

function getTime(){
    var date = new Date();
    var year = date.getFullYear();
    var month = date.getMonth()+1;
    var day = date.getDate();
    var hour = date.getHours()<10?'0'+date.getHours():date.getHours();
    var minute = date.getMinutes()<10?'0'+date.getMinutes():date.getMinutes();
    var second = date.getSeconds()<10?'0'+date.getSeconds():date.getSeconds();
    return (year+'-'+month+'-'+day+' '+hour+':'+minute+':'+second);
}

module.exports = Mind;

var mindSchema =  new mongoose.Schema({
    title:String,
    editor:String,
    time:String,
    data:[]
},{
    collection:'minds'
});

var mindModel = mongoose.model('Mind',mindSchema);

Mind.prototype.save = function (callback) {
    var mind = {
        title:this.title,
        editor:this.editor,
        time:getTime(),
        data:this.data
    };

    mindModel.create(mind,function (error,mind) {
        if(error){
            callback(error);
        }else{
            console.log('保存成功');
            callback(null,mind);
        }
    });
};

Mind.getOne = function (option,callback) {
    mindModel.findOne(option,function(error,mind){
        if(error)
            callback(error);
        callback(null,mind);
    })
};

Mind.get = function (option,callback) {
    mindModel.find(option,function(error,mind){
        if(error)
            callback(error);
        callback(null,mind);
    })
};

Mind.update = function (id,data,options,callback) {
    mindModel.update({"_id":id},{$set:{data:data,time:getTime()}},options,function (error,mind) {
        if(error){
            callback(error);
        }else{
            callback(null,mind);
        }
    })
};

Mind.remove = function(option,callback){
  mindModel.remove(option,function (error,mind) {
      if(error){
          callback(error);
      }else{
          callback(null,mind);
      }
  })
};