//작업자 로그인 정보 (이름값)
var ManagerId = sessionStorage.getItem('ManagerId');

console.log("id="+ManagerId);

const managerId = ManagerId.split("*");
document.getElementById("mangerName").innerHTML = managerId[1];

//AreaWorkerPreview.js에서 넘겨준 session 값을 쉼표(,)를 기준으로 나눔
var areaWorkerId = sessionStorage.getItem('areaWorkerId');
console.log(areaWorkerId);
var area = areaWorkerId.split('!')[0];
var Worker = areaWorkerId.split('!')[1];
var WorkerInfo = new Array();
var WorkerSize = Worker.split(',').length;

for(var i = 0; i < WorkerSize; i++) {
	WorkerInfo[i] = "";
	WorkerInfo[i] = Worker.split(',')[i];
}

//현재 구역 표시
document.getElementById("area").innerHTML = area + " 구역";
console.log(area);

var workerCount = 0;

//이미지를 클릭하면 해당 이미지 alt 값을 가지고 WorkerInfo.html로 이동
function getClickHandler(k) {
	return function(e) {
		console.log("이미지를 누름");
		console.log(k);
		sessionStorage.setItem('WorkerINFO', k);
		location.href="WorkerInfo.html";
	}
}

function createDIV() {
	var img = new Array();
	var workerImgSrc = new Array();
	var workerId = new Array();
	var count = 0;

	for(var i = 0; i < WorkerSize; i++) {
		workerId[i] = "";
		workerId[i] = WorkerInfo[workerCount].split('*')[1];
		console.log(workerId[i]);

		//image
		img[i] = "";
		img[i] = document.createElement('img');
		img[i].alt = WorkerInfo[workerCount].split('*');
		img[i].src = WorkerInfo[workerCount].split('*')[2];
		img[i].style.width = "200px";
		img[i].style.height = "200px";		
		img[i].addEventListener('click', getClickHandler(img[i].alt)); 

		//figure
		var figure = document.createElement('figure');
		figure.style = "float:left; padding-left:20px"

		//caption
		var caption = document.createElement('figcaption');

		var name = document.createTextNode(WorkerInfo[workerCount].split('*')[0]);
		caption.append(name);
		caption.style = "text-align:center"

		figure.append(img[i]);
		figure.append(caption);

		document.getElementById('test').append(figure);

		workerCount++;
		count++;

	}
}

createDIV();




