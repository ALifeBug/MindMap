$(function () {
    $("input:password,input:text").focus(function() {
        $(this).css("borderColor","#007bff");
    }).blur(function() {
        $(this).css("borderColor","#cccccc");
    });
    $("#submit").mouseover(function () {
        $(this).css('backgroundColor','#66afe9');
    }).mouseout(function () {
        $(this).css('backgroundColor','#007bff');
    });
});

$(function () {
    $("#email").blur(function () {
        var reg=/^[a-zA-Z0-9_-]+@[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)+$/;
        if($(this).val()!=="") {
            if (!reg.test($(this).val()))
                $("#email-error").text("邮箱格式不正确!");
            else {
                $.ajax({
                    type: "post",
                    url: "/checkemail",
                    data: {
                        email: $(this).val()
                    },
                    success: function (data) {
                        if (data) {
                            if (data.result === "notReged")
                                $("#email-error").text("该账户不存在!");
                            else if (data.result === "reged")
                                $("#email-error").text("");
                        }
                    }
                });
            }
        }
    });

    $("#submit").click(function () {
        if($('#email-error').text()==="") {
            $.ajax({
                method: "post",
                url: "/login",
                dataType: "json",
                data: {
                    email: $("#email").val(),
                    password: $("#password").val()
                },
                success: function (data) {
                    if (data) {
                        if (data.result === "false")
                            $("#password-error").text("密码不正确!");
                        else {
                            window.location.href = "/";
                        }
                    }
                }
            });
        }
    });

});


