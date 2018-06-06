$(function () {
    $('#newMind').click(function () {
        if($('#title').val()===''){
            $('#title').css('borderColor','#f41717');
            return;
        }else $.ajax({
            type:"post",
            url:"/mind/new",
            data:{title:$('#title').val()},
            success: function (data) {
                if(data){
                    window.location.href = 'http://47.95.194.211:3006/mind/load?id='+data.mindid;
                }
            }
        })
    });

    const socket = io('http://47.95.194.211:3006');
    socket.on('connect', () => {
        console.log(socket.id);
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
                window.location.href=data.url;
            })
        });
    });

});
