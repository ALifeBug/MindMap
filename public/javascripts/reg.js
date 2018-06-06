$(function () {
    $("input:password,input:text").focus(function() {
        $(this).css("borderColor","#007bff");
    }).blur(function() {
        $(this).css("borderColor","#cccccc");
    });
    $("input:submit").mouseover(function () {
        $(this).css('backgroundColor','#66afe9');
    }).mouseout(function () {
        $(this).css('backgroundColor','#007bff');
    });
});

$(function () {
    $("#name").blur(function () {
        if($(this).val()!=="") {
                $.ajax({
                    type: "post",
                    url: "http://47.95.194.211:3006/checkname",
                    data: {
                        name: $(this).val()
                    },
                    success: function (data) {
                        if (data) {
                            if (data.result === "reged")
                                $("#name-error").text("该昵称已被占用!");
                            else if (data.result === "notReged")
                                $("#name-error").text("");
                        }
                    }
                });
            }
    });
   $("#email").blur(function () {
       var reg=/^[a-zA-Z0-9_-]+@[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)+$/;
       if($(this).val()!=="") {
           if (!reg.test($(this).val()))
               $("#email-error").text("邮箱格式不正确!");
           else {
               $.ajax({
                   type: "post",
                   url: "http://47.95.194.211:3006/checkemail",
                   data: {
                       email: $(this).val()
                   },
                   success: function (data) {
                       if (data) {
                           if (data.result === "reged")
                               $("#email-error").text("该邮箱已被注册!");
                           else if (data.result === "notReged")
                               $("#email-error").text("");
                       }
                   }
               });
           }
       }
   });
   $("#password-repeat").blur(function () {
       if($(this).val()!==$("#password").val())
           $("#repeat-error").text("两次密码输入不一致!");
       else
           $("#repeat-error").text("");
   });

   $("#form").submit(function () {
       var error = $("#repeat-error").text()+$("#email-error").text();
       if(error==="")
           return true;
       else
           return false;
   })
});
