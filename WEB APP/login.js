// 중지를 위해 ID 보관
var intervalId = null;

// API 시작
function Start() { 
    $('#loading').show();
    invokeAPI();
}

var invokeAPI = function() {
    var API_URI = 'API URI' + document.getElementsByName("id")[0].value;
    

    $.ajax(API_URI, {
        method: 'GET',
        contentType: "application/json",

        success: function (data, status, xhr) {
                var start = data.indexOf('[');
                var end = data.indexOf(']');
                data = data.substring(start+1, end);
                data = '{"login_data": ' + data + '}';
                
                var result = JSON.parse(data);                

                checkData(result)

                console.log("data="+data);
        },
        error: function(xhr,status,e){
                alert("error");
        }
    });
};

var checkData = function(result) {
    var id = document.getElementsByName("id")[0].value;
    var pass = document.getElementsByName("pass")[0].value;
    var name = result.login_data.managerName;

    if(id == result.login_data.Id && pass == result.login_data.password) {
        sessionStorage.setItem('ManagerId', id+"*"+name);
        location.href="ManagerMain.html";
    }
    else
        alert("비밀번호가 올바르지 않습니다.");
}

$(window).load(function() {
 $('#loading').hide(); 
});
