$(function () {

    const socket = io('http://47.95.194.211:3006');
    /*
    每次连接时均修改socket.id,使得服务器在转发邀请时可以找到对应的用户
     */
    socket.on('connect', () => {
        $.ajax({
            type:'post',
            url:'/username',
            data:{},
            success:function (data) {
                if(data){
                    socket.emit('setName',data.name);
                }
            }
        });

        socket.on('invited',function (data) {
            $('#inviteModal').modal('show');
            $('#from').text(data.from);
            $('#accept').bind('click',function () {
                socket.emit('join',{'roomid':data.roomid,'name':data.to});
                socket.on('joinsuccess',function () {
                    window.location.href=data.url;
                });

            })
        });
    });

});
