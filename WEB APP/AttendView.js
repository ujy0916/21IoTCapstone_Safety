//작업자 로그인 정보 (이름값)
var ManagerId = sessionStorage.getItem('ManagerId');

console.log("id="+ManagerId);

const managerId = ManagerId.split("*");
document.getElementById("mangerName").innerHTML = managerId[1];

//HashMap
HashMap = function() {
	this.map = new Array();
}

HashMap.prototype = {
	put : function(key, value) {
		this.map[key] = value;
	},
	get : function(key) {
		return this.map[key];
	},
	getAll : function() {
		return this.map;
	},
	clear : function() {
		this.map = new Array();
	},
	getKeys : function() {
		var keys = new Array();
		for(i in this.map) {
			keys.push(i);
		}
		return keys;
	},
	getSize : function() {
		var keys = new Array();
		for(i in this.map) {
			keys.push(i);
		}
		return keys.length;
	}
};

//입력 받은 달력 날짜 timestamp로 변환하기
function CanlendarDate() {

	//기존 html에 있는 ul의 위치 가져오기
	var AttendNameUl = document.getElementById('AttendName');
	var AttendListUl = document.getElementById('AttendList');
	var ExitListUl = document.getElementById('ExitList');

	//조회중이라고 출력하는 부분
	var SearchingLi = document.createElement('li');
	var	SearchingDiv = document.createElement('div');
	SearchingLi.className = "list-group-item";
	SearchingDiv.id = "search1";
	SearchingDiv.innerHTML = "조회중...";
	SearchingLi.append(SearchingDiv);
	AttendNameUl.append(SearchingLi);

	var SearchingLi2 = document.createElement('li');
	var	SearchingDiv2 = document.createElement('div');
	SearchingLi2.className = "list-group-item";
	SearchingDiv2.id = "search2";
	SearchingDiv2.innerHTML = "조회중...";
	SearchingLi2.append(SearchingDiv2);
	AttendListUl.append(SearchingLi2);

	var SearchingLi3 = document.createElement('li');
	var	SearchingDiv3 = document.createElement('div');
	SearchingLi3.className = "list-group-item";
	SearchingDiv3.id = "search3";
	SearchingDiv3.innerHTML = "조회중...";
	SearchingLi3.append(SearchingDiv3);
	ExitListUl.append(SearchingLi3);

	var searchDate = document.getElementById('searchWarningDate').value;
	var searchDate_timestamp = new Date(searchDate)/1000 - 32400;
	var searchDate_timestamp_endTime = searchDate_timestamp+60*60*24;
	console.log(searchDate_timestamp);

	var API_URI = 'API 주소?from='+searchDate_timestamp
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

function checkData(result) {
	var size = Object.keys(result.AttendDB_data).length;
	console.log(size);


	var map = new HashMap();

	if(size == 0) {
		console.log("size = 0");
		document.getElementById('search1').innerHTML = "해당 내역이 없습니다.";
		document.getElementById('search2').innerHTML = "해당 내역이 없습니다.";
		document.getElementById('search3').innerHTML = "해당 내역이 없습니다.";
	}

	else {
		for(var i=0; i<size; i++) {
			var value = new Array();
			var workerNameK = result.AttendDB_data[i].workerNameK;
			var attendTimestamp = result.AttendDB_data[i].timestamp;

			if(map.get(workerNameK)) {
				//해시맵 안에 해당 한글이름이 있다면...
				value = map.get(workerNameK)
				value.push(attendTimestamp);
			}
			else {
				console.log('여기');
				value.push(attendTimestamp);
				map.put(workerNameK, value);
			}
		}

		console.log(map);
		console.log(map.getSize());

		//기존 html에 있는 ul의 위치 가져오기
		var AttendNameUl = document.getElementById('AttendName');
		var AttendListUl = document.getElementById('AttendList');
		var ExitListUl = document.getElementById('ExitList');

		//적혀져 있는 부분 지우기
		deleteDiv1 = document.getElementsByClassName("search1");
		deleteDiv2 = document.getElementsByClassName("search2");
		deleteDiv3 = document.getElementsByClassName("search3");
		AttendNameUl.remove(deleteDiv1);
		AttendListUl.remove(deleteDiv2);
		ExitListUl.remove(deleteDiv3);


		for(var i=0; i<map.getSize(); i++) {	

			//AttendNameUl li, div 생성
			AttendDiv1 = document.getElementById('parent1');
			AttendNameUl = document.createElement('ul');
			var AttendNameLi = document.createElement('li');
			var	AttendNameDiv = document.createElement('div');

			//AttendListUl li, div 생성
			AttendDiv2 = document.getElementById('parent2');
			AttendListUl = document.createElement('ul');
			var AttendListLi = document.createElement('li');
			var	AttendListDiv = document.createElement('div');

			//ExitListUl li, div 생성
			AttendDiv3 = document.getElementById('parent3');
			ExitListUl = document.createElement('ul');
			var ExitListLi = document.createElement('li');
			var	ExitListDiv = document.createElement('div');

			var KorName = map.getKeys()[i];

			//각 값 넣어주기
			AttendNameUl.className = 'list-group';
			AttendNameLi.className = "list-group-item";
			AttendNameDiv.innerHTML = KorName;

			AttendListUl.className = 'list-group';
			AttendListLi.className = "list-group-item";
			AttendListDiv.innerHTML = map.get(KorName)[0];

			ExitListUl.className = 'list-group';
			ExitListLi.className = "list-group-item";
			ExitListDiv.innerHTML = map.get(KorName)[map.get(KorName).length-1];

			AttendNameLi.append(AttendNameDiv);
			AttendNameUl.append(AttendNameLi);
			AttendDiv1.append(AttendNameUl);

			AttendListLi.append(AttendListDiv);
			AttendListUl.append(AttendListLi);
			AttendDiv2.append(AttendListUl);

			ExitListLi.append(ExitListDiv);
			ExitListUl.append(ExitListLi);
			AttendDiv3.append(ExitListUl);

		}

		document.getElementById('totalCount').innerHTML = map.getSize();
	}

}