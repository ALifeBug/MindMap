var nodemailer = require('nodemailer');

var config = {
    host: 'smtp.163.com',
    port: 25,
    auth:{
        user:'18811503658@163.com',
        pass:'hqs2018'
    }
};
//创建Smtp客户端对象
var transporter = nodemailer.createTransport(config);

//发送邮件
module.exports = function(mail){
    transporter.sendMail(mail,function (error,info) {
        if(error){
            return console.log(error);
        }
        console.log('mail sent:',info.response);
    });
    transporter.close();
};