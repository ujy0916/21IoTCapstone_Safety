//작업자 로그인 정보 (이름값)
var ManagerId = sessionStorage.getItem('ManagerId');

console.log("id="+ManagerId);

const managerId = ManagerId.split("*");
document.getElementById("mangerName").innerHTML = managerId[1];

//pop Over
$(document).ready(function() {
	$('[data-toggle="popover"]').popover({
		content: function() {
			return "자세히";
		}
	});
});

//invokeAPI
var invokeAPI = function() {
    //AWS
    var API_URI = 'API URI';    

    $.ajax(API_URI, {
        method: 'GET',
        contentType: "application/json",

        success: function (data, status, xhr) {                
                var result = JSON.parse(data);                

                checkData(result);
        },
        error: function(xhr,status,e){
                alert("error");
        }
    });
};

var invokeAPI2 = function(area, workerId) {
	console.log("invokeAPI2");
	var API_URI = 'API URI' + workerId;

	$.ajax(API_URI, {
        method: 'GET',
        contentType: "application/json",

        success: function (data, status, xhr) {                
                var result = JSON.parse(data);
                

                checkData2(area, result)

                console.log("workerDB data="+data);
        },
        error: function(xhr,status,e){
                alert("error");
        }
    });
}

var checkData = function(result) {
    var workerSection = "";
    var size = Object.keys(result.MatchingDB_data).length; //json 요소 크기
    var workerName = new Array();
    console.log(size);

    for(var i=0; i<size; i++ ) {
    	console.log("for문");
    	workerSection = result.MatchingDB_data[i].workSection;
	    if(workerSection == "A1") {
	    	workerId = result.MatchingDB_data[i].workerId;
	    	workerId = workerId.split("X")[0];
	    	console.log(workerId);
	    	invokeAPI2(workerSection, workerId);
	    }
	    else if(workerSection == "A2") {
	    	workerId = result.MatchingDB_data[i].workerId;
	    	workerId = workerId.split("X")[0];
	    	console.log(workerId);
	    	invokeAPI2(workerSection, workerId);
	    }
	    else if(workerSection == "A3") {
	    	workerId = result.MatchingDB_data[i].workerId;
	    	workerId = workerId.split("X")[0];
	    	console.log(workerId);
	    	invokeAPI2(workerSection, workerId);
	    }
	}
}

var A1_workerName = new Array();
var A2_workerName = new Array();
var A3_workerName = new Array();

var A1_workerId = new Array();
var A2_workerId = new Array();
var A3_workerId = new Array();

var num = new Array(0,0,0);

var checkData2 = function(area, result) {
	console.log("checkData2");
	workerNameK = result.WorkerDB_data[0].workerNameK;
	workerNameE = result.WorkerDB_data[0].workerNameE;
	workerPhone = result.WorkerDB_data[0].phone;
	WorkerId = result.WorkerDB_data[0].WorkerId;
	workerImage = result.WorkerDB_data[0].workerImage;
	console.log(workerNameK);

	if(area == "A1") {
		if(num[0] <= 10) {
			console.log("num[0] "+num[0]);
			A1_workerName[num[0]] = "";
			A1_workerName[num[0]] += workerNameK;
			A1_workerId[num[0]] = "";
			A1_workerId[num[0]] = workerNameK+"*"+WorkerId+"*"+workerImage+"*"+workerNameE+"*"+workerPhone;
			num[0]++;
			document.getElementById("A1worker").innerHTML = "";
			document.getElementById("A1worker").innerHTML = A1_workerName.sort();
			A1_workerId.sort();
		}
		else
			num[0]++;		
	}
	else if(area == "A2") {
		if(num[1] <= 10) {
			A2_workerName[num[1]] = "";
			A2_workerName[num[1]] += workerNameK;
			A2_workerId[num[1]] = "";
			A2_workerId[num[1]] = workerNameK+"*"+WorkerId+"*"+workerImage+"*"+workerNameE+"*"+workerPhone;
			num[1]++;
			document.getElementById("A2worker").innerHTML = "";
			document.getElementById("A2worker").innerHTML = A2_workerName.sort();
			A2_workerId.sort();
		}
		else
			num[1]++;
	}
	else if(area == "A3") {
		if(num[2] <= 10) {
			A3_workerName[num[2]] = "";
			A3_workerName[num[2]] += workerNameK;
			A3_workerId[num[2]] = "";
			A3_workerId[num[2]] = workerNameK+"*"+WorkerId+"*"+workerImage+"*"+workerNameE+"*"+workerPhone;
			num[2]++;
			document.getElementById("A3worker").innerHTML = "";
			document.getElementById("A3worker").innerHTML = A3_workerName.sort();
			A3_workerId.sort();
		}
		else
			num[2]++;
	}

	if(num[0] == 0) {
			document.getElementById("A1worker").innerHTML = "해당 구역에 작업자가 없습니다.";
		}
	if(num[1] == 0) {
		document.getElementById("A2worker").innerHTML = "해당 구역에 작업자가 없습니다.";
	}
	if(num[2] == 0) {
			document.getElementById("A3worker").innerHTML = "해당 구역에 작업자가 없습니다.";
	}

	document.getElementById("A1total").innerHTML = num[0];
	document.getElementById("A2total").innerHTML = num[1];
	document.getElementById("A3total").innerHTML = num[2];

}

invokeAPI();

//10분 후에 다시 Loading
var retryAPI = setInterval(function() {
	A1_workerName = [];
	A2_workerName = [];
	A3_workerName = [];
	num[0] = 0;
	num[1] = 0;
	num[2] = 0;
    invokeAPI();
}, 600000);

//Timer
var SetTime = 600;  //60초 = 1분
var retryTimer = setInterval(function() {
    msg_time();
}, 1000);

function msg_time() {
    m = Math.floor(SetTime/60) + "분 " + (SetTime%60) +"초";
    var msg = "<font color='darkblue'>" + m + "</font>";
    document.getElementById("ViewTimer").innerHTML = msg;
    SetTime--;

    if(SetTime < 0) {
        document.getElementById("ViewTimer").innerHTML = "곧 그래프가 재로딩 됩니다.";
        SetTime = 600;
    }
}

//reset
$("#resetButton").click(function reset() {
    clearInterval(retryAPI);
    clearInterval(retryTimer);
    A1_workerName = [];
	A2_workerName = [];
	A3_workerName = [];
	num[0] = 0;
	num[1] = 0;
	num[2] = 0;
    invokeAPI();

    setInterval(function() {
    A1_workerName = [];
	A2_workerName = [];
	A3_workerName = [];
	num[0] = 0;
	num[1] = 0;
	num[2] = 0;
        invokeAPI();
    }, 600000);

    SetTime = 600;
    setInterval(function() {
        msg_time();
    }, 1000);

});

//A1_AreaWorker
function A1AreaWorker() {
	console.log("A1 버튼을 누름");
	console.log(A1_workerId);	
	sessionStorage.setItem('areaWorkerId', "A1"+"!"+A1_workerId);
	location.href="AreaWorker.html";
}

//A2_AreaWorker
function A2AreaWorker() {
	console.log("A2 버튼을 누름");
	console.log(A2_workerId);
	sessionStorage.setItem('areaWorkerId', "A2"+"!"+A2_workerId);
	location.href="AreaWorker.html";
}

//A3_AreaWorker
function A3AreaWorker() {
	console.log("A3 버튼을 누름");
	console.log(A3_workerId);
	sessionStorage.setItem('areaWorkerId', "A3"+"!"+A3_workerId);
	location.href="AreaWorker.html";
}

    