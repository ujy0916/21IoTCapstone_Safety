//작업자 로그인 정보 (이름값)
var ManagerId = sessionStorage.getItem('ManagerId');

console.log("id="+ManagerId);

const managerId = ManagerId.split("*");
document.getElementById("mangerName").innerHTML = managerId[1];


//입력 받은 달력 날짜 timestamp로 변환하기
function CanlendarDate() {
	var searchDate = document.getElementById('searchWarningDate').value;
	var searchDate_timestamp = (new Date(searchDate)/1000)-32400; 
	console.log(searchDate_timestamp);
	var searchDate_timestamp_endTime = searchDate_timestamp+60*60*24;
	console.log(searchDate_timestamp);

	var API_URI = 'API URI'+searchDate_timestamp
					+'&to='+searchDate_timestamp_endTime;
    

    $.ajax(API_URI, {
        method: 'GET',
        contentType: "application/json",

        success: function (data, status, xhr) {                
                var result = JSON.parse(data);
                
                console.log(data);

                checkData(result);
        },
        error: function(xhr,status,e){
                alert("error");
        }
    });
}

var warningLiCountIfSize0 = 0;
var warningTotalCount = 0;
function checkData(result) {
	var size = Object.keys(result.SensorDB_data).length;

	if(size > 0) {
		var size = Object.keys(result.SensorDB_data).length;
		console.log(size);

		for(var i=0; i<size; i++) {
			var warningDanger = result.SensorDB_data[i].danger;
			if(warningDanger != "0"){
				warningTotalCount++;
				var warningworkerSection = "";
				var warningTime = "";
				var warningWorkId = "";

				warningworkerSection = result.SensorDB_data[i].workSection;
				warningTime = result.SensorDB_data[i].timestamp;
				warningWorkId = result.SensorDB_data[i].WorkId;

				console.log(warningWorkId);

				console.log(warningLiCountIfSize0);

				//해당 내역이 없는 없습니다 라는 리스트가 생성되어 있는 경우
				if(warningLiCountIfSize0 > 0) {  
					var warningUl = document.getElementById('AddWarningList');
					var warningLi = document.getElementsByClassName("list-group-item");
					var warningDiv = document.getElementsByClassName("warningDiv");
					warningUl.remove(warningDiv);

					warningUl = document.createElement('ul');
					warningLi = document.createElement('li');
					warningDiv = document.createElement('div');

					warningUl.className = 'list-group';
					warningUl.id = 'AddWarningList';
					warningLi.className = "list-group-item";
					warningDiv.className = "warningDiv";

					warningDiv.innerHTML = "위험 발생 시간 : "+warningTime + " 위험 발생 구역 : " + warningworkerSection 
											+ " 위험 요소 : " + warningDanger;

					warningLi.append(warningDiv);
					warningUl.append(warningLi);

					var warningBody = document.getElementById('parent');
					warningBody.append(warningUl);


					warningLiCountIfSize0 = 0;
				}
				else {
					warningUl = document.getElementById('AddWarningList');
					warningLi = document.createElement('li');
					warningDiv = document.createElement('div');

					warningLi.className = "list-group-item";
					warningDiv.className = "warningDiv";

					warningDiv.innerHTML = "위험 발생 시간 : " + warningTime + "&nbsp;&nbsp;&nbsp;&nbsp;" + " 위험 발생 구역 : " + warningworkerSection 
											+ "&nbsp;&nbsp;&nbsp;&nbsp;" + " 위험 요소 : " + warningDanger;

					warningLi.append(warningDiv);
					warningUl.append(warningLi);
				}

			}
			
		}

		document.getElementById('totalCount').innerHTML = warningTotalCount;

	}
	else {
		if(warningLiCountIfSize0 == 0) {
			//기존 리스트 삭제
			console.log(document.getElementsByClassName("warningDiv"));
			var warningDiv = document.getElementsByClassName("warningDiv");

			var warningUl = document.getElementById('AddWarningList');
			var warningLi = document.getElementsByClassName("list-group-item");
			warningUl.remove(warningDiv);

			//삭제한 부분에 생성
			warningUl = document.createElement('ul');
			warningLi = document.createElement('li');
			warningDiv = document.createElement('div');

			warningUl.className = 'list-group';
			warningUl.id = 'AddWarningList';

			warningLi.className = "list-group-item";

			warningDiv.className = "warningDiv";		
			warningDiv.innerHTML = "해당 내역이 없습니다.";

			warningLi.append(warningDiv);
			warningUl.append(warningLi);

			var warningBody = document.getElementById('parent');
			warningBody.append(warningUl);

			warningLiCountIfSize0++;

			console.log(warningLiCountIfSize0);
			document.getElementById('totalCount').innerHTML = "";
		}
	}
}