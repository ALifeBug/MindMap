var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/mind');

/**
 * 连接成功
 */
mongoose.connection.on('connected', function () {
    console.log('数据库连接成功');
});

/**
 * 连接异常
 */
mongoose.connection.on('error',function (err) {
    console.log('数据库连接出现错误，错误为：'+ err);
});

/**
 * 连接断开
 */
mongoose.connection.on('disconnected', function () {
    console.log('数据库连接断开');
});

module.exports = mongoose;