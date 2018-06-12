var mongoose = require('./db');

//函数定义对象User
function  User(user) {
    this.name=user.name;
    this.password=user.password;
    this.email=user.email;
}

module.exports = User;

//定义模型
var userSchema = new mongoose.Schema({
    name:{type:String},
    password:{type:String},
    email:String
},{
    collection:'user'
});

//Schema发布为model
var userModel = mongoose.model('User',userSchema);


//保存方法
User.prototype.save=function (callback) {
    var user = {
        name:this.name,
        password:this.password,
        email:this.email
    };

    userModel.create(user,function (error,user) {
        if(error){
            callback(error);
        }else{
            console.log('保存成功');
            callback(null,user);
        }
    });
};

//查询
User.get = function (option,callback) {
    userModel.findOne(option,function(error,user){
            if(error)
                 callback(error);
            callback(null,user);
    })
};