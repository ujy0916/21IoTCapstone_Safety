// 기본 위치(top)값
var floatPosition = parseInt($(".sideBanner").css('top'))

// scroll 인식
$(window).scroll(function() {

    // 현재 스크롤 위치
    var currentTop = $(window).scrollTop();
    var bannerTop = currentTop + floatPosition + "px";

    //이동 애니메이션
    $(".sideBanner").stop().animate({
      "top" : bannerTop
    }, 500);

}).scroll();

//배너의 작업자 이름을 클릭하면 발생하는 함수
function getClickDangerWorkerHandler(k) {
	return function(e) {
		console.log("이름을 클릭");
		console.log(k);
		sessionStorage.setItem('WorkerINFO', k);
		location.href="WorkerInfo.html";
	}
}

var dangerWorker = new Array(); //danger가 0이 아닌 작업자의 workerId(숫자X영어이름)

//MatchingDB에서 정보 가져오기
var BannerInvokeAPI = function() {
    //AWS
    var API_URI = 'API URI';    

    $.ajax(API_URI, {
        method: 'GET',
        contentType: "application/json",

        success: function (data, status, xhr) {                
                var result = JSON.parse(data);                

                BannerCheckData(result);
        },
        error: function(xhr,status,e){
                alert("error");
        }
    });
};

var BannerCheckData = function(result) {
	var size = Object.keys(result.MatchingDB_data).length;
	console.log("banner : " + size);

	//danger가 몇개인지 세는 변수
	var count = 0; 
	
	for(var i=0; i < size; i++) {
		if(result.MatchingDB_data[i].danger != 0) {
			dangerWorker[count] = "";
			dangerWorker[count] = result.MatchingDB_data[i].workerId.split('X')[0]+"*"+result.MatchingDB_data[i].workSection;
			count++;
		}
	}
	BannerInvokeAPI2(dangerWorker);
}

var BannerworkerId = "";
var BannerworkerInfo = new Array();
var BannerworkerInfoCount = 0;
var BannerDangerWorker = 0;

//WorkerDB에서 정보 가져오기 -> Session 만들어서 넘겨주기
var BannerInvokeAPI2 = function(dWorker) {
	var BannerDiv = document.getElementById('BannerDanger');
	BannerDiv.innerHTML = "";

	for(var i=0; i<dWorker.length; i++) {
		BannerWorkerId = dWorker[i].split("*")[0];
		var BannerworkerSection = dWorker[i].split("*")[1];

		if(BannerWorkerId != "None") {
			BannerworkerInfo[BannerworkerInfoCount] = "";
			BannerworkerInfo[BannerworkerInfoCount] = dWorker[i];
			console.log(BannerworkerInfo[BannerworkerInfoCount]);
			BannerworkerInfoCount++;

			var API_URI = 'API URI' + BannerWorkerId;

			$.ajax(API_URI, {
		        method: 'GET',
		        contentType: "application/json",

		        success: function (data, status, xhr) {                
		                var result = JSON.parse(data);
		                console.log("Banner workerDB data=" + data);

		                BannerCheckData2(result);
		        },
		        error: function(xhr,status,e){
		                alert("error");
		        }
		    });
		}
	}
}

var BannerCheckData2 = function(result) {
	var BannerWId = "";

	for(var i = 0; i < BannerworkerInfo.length; i++) {
		if(BannerworkerInfo[i].split("*")[0] == result.WorkerDB_data[0].WorkerId) {
			BannerWId = BannerworkerInfo[i];
		}			
	}
	
	console.log("BannerWId" + BannerWId);

	var BannerWSection = BannerWId.split("*")[1];
	var BannerWoId = BannerWId.split("*")[0];
	console.log("BannerWSection" + BannerWSection);


	var resultSize = Object.keys(result.WorkerDB_data).length;
	if(resultSize == 0)  {
		console.log("NULL");
	}

	else {
		var workerNameKor = result.WorkerDB_data[0].workerNameK;
		var workerImg = result.WorkerDB_data[0].workerImage;
		var workerNamEng = result.WorkerDB_data[0].workerNameE;
		var workerPhone = result.WorkerDB_data[0].phone;

		var BannerSession = workerNameKor+","+BannerWoId+","+workerImg+","+workerNamEng+","+workerPhone;

		var BannerDiv = document.getElementById('BannerDanger');

		createDiv = document.createElement('div');

		createDiv.innerHTML = workerNameKor + "(" + BannerWSection +")";
		createDiv.class = BannerSession;
		createDiv.id = "BannerDangerDiv";
		createDiv.addEventListener('click', getClickDangerWorkerHandler(createDiv.class));

		BannerDiv.append(createDiv);
		
	}
}

BannerInvokeAPI();