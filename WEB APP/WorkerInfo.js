//작업자 로그인 정보 (이름값)
var ManagerId = sessionStorage.getItem('ManagerId');
console.log("id="+ManagerId);
const managerId = ManagerId.split("*");
document.getElementById("mangerName").innerHTML = managerId[1];

var WorkerINFO = sessionStorage.getItem('WorkerINFO');

console.log("id="+WorkerINFO);

//WorkerINFO에서 worker정보들 나누기
var WorkerName = WorkerINFO.split(",")[0];
var WorkerId = WorkerINFO.split(",")[1];
var WorkerImg = WorkerINFO.split(",")[2];
var EngName = WorkerINFO.split(",")[3];    
var WorkerPhone = WorkerINFO.split(",")[4];

console.log("WorkerName "+ WorkerName);
console.log("WorkerId " + WorkerId);
console.log("WorkerImg " + WorkerImg);

//페이지에 정보 띄우기
document.getElementById("workerImg").src = WorkerImg;
document.getElementById("workerImg").alt = WorkerId;
document.getElementById("workerName").innerHTML = WorkerName;
document.getElementById('engName').innerHTML = "<span class='glyphicon glyphicon-user one' style='width:50px; font-size: 20px'></span>"
    												+ EngName;
document.getElementById('workerPhone').innerHTML = "<span class='glyphicon glyphicon-earphone' style='width:50px; font-size: 20px'></span>"
    													+ WorkerPhone;

//작업자 정보 가지고 오기
var invokeAPI = function() {
    //AWS
    var API_URI = 'API URI' + WorkerId;    

    $.ajax(API_URI, {
        method: 'GET',
        contentType: "application/json",

        success: function (data, status, xhr) {                
                var result = JSON.parse(data);              

                console.log(result);
                checkData(result);
        },
        error: function(xhr,status,e){
                alert("error");
        }
    });
};

var checkData = function(result) {

	var size = Object.keys(result.WorkerSensorDB_data).length;
    console.log(size);


	if(size == 0) {
		alert("해당 작업자의 정보가 존재하지 않습니다.\n모니터링 페이지로 넘어갑니다.");
		document.location.href = "ManagerMain.html";
	}

	
	document.getElementById('workerGps').innerHTML = result.WorkerSensorDB_data[size-1].workSection;
    var workerDA = result.WorkerSensorDB_data[size-1].danger;
    var danger_size = workerDA.split("*").length;
    console.log(danger_size);
    var danger_kor = new Array();
    
    var danger_position = 0;
    for(var i=0; i<danger_size; i++) {
        console.log(workerDA.split("*")[i]);
        if(workerDA.split("*")[i]=="MQ4") {
            danger_kor[danger_position] = "";
            danger_kor[danger_position] = "메탄가스";
        }
        if(workerDA.split("*")[i]=="MQ7") {
            danger_kor[danger_position] = "";
            danger_kor[danger_position] = "일산화탄소";
        }
        if(workerDA.split("*")[i]=="humi") {
            danger_kor[danger_position] = "";
            danger_kor[danger_position] = "습도";
        }
        if(workerDA.split("*")[i]=="temp") {
            danger_kor[danger_position] = "";
            danger_kor[danger_position] = "온도";
        }   
        danger_position++;   

    }

    console.log(danger_kor);

    if(workerDA == "0") {
        document.getElementById('workerDA').innerHTML = "안전";
        document.getElementById('dangerIcon').className = "glyphicon glyphicon-ok";
        document.getElementById('dangerIcon').style = "color:green; font-size: 40px";
    }
    else {
        document.getElementById('workerDA').color = "red";
        document.getElementById('workerDA').innerHTML = danger_kor;
    }
     

	var timeArray = new Array();
	var tempArray = new Array();
	var humiArray = new Array();
	var Mq4Array = new Array();
	var Mq7Array = new Array();

    if(size > 7) {
        var position = 7;
        for(var i=0; i<7; i++) {            
            timeArray[i] = "";
            timeArray[i] = result.WorkerSensorDB_data[size-position].timestamp;
            tempArray[i] = "";
            tempArray[i] = result.WorkerSensorDB_data[size-position].temperature;
            humiArray[i] = "";
            humiArray[i] = result.WorkerSensorDB_data[size-position].humidity;
            Mq4Array[i] = "";
            Mq4Array[i] = result.WorkerSensorDB_data[size-position].Mq4;
            Mq7Array[i] = "";
            Mq7Array[i] = result.WorkerSensorDB_data[size-position].Mq7;
            position--;
        }
    }

    else {
        for(var i=0; i<danger_size;i++) {
            timeArray[i] = "";
            timeArray[i] = result.WorkerSensorDB_data[i].timestamp;
            tempArray[i] = "";
            tempArray[i] = result.WorkerSensorDB_data[i].temperature;
            humiArray[i] = "";
            humiArray[i] = result.WorkerSensorDB_data[i].humidity;
            Mq4Array[i] = "";
            Mq4Array[i] = result.WorkerSensorDB_data[i].Mq4;
            Mq7Array[i] = "";
            Mq7Array[i] = result.WorkerSensorDB_data[i].Mq7;
        }
    }

	console.log(timeArray);
	console.log(tempArray);
	console.log(humiArray);
	console.log(Mq4Array);
    console.log(Mq7Array);

	//메탄 그래프
	var Mq4ctx = document.getElementById('Mq4chart');

	var Mq4chart = new Chart(Mq4ctx, {
		type : 'line',
    	data : {
    		labels: timeArray,
    		datasets: [{
    			label: '메탄가스 농도',
    			data: Mq4Array,
    			backgroundColor: 'transparent',
    			borderColor: 'rgba(153, 102, 255)',
    			borderWidth: 3,
    			pointBackgroundColor: 'purple'
    		}]
    	},
    	options: {
    		maintainAspectRatio: false,
    		tooltips: {
    			enabled: false
    		},
    		hover: {
    			animationDuration: 0
    		},
    		animation: {
    			duration: 1,
    			onComplete: function () {
    				var chartInstance = this.chart,
    				ctx = chartInstance.ctx
    				ctx.font = Chart.helpers.fontString(Chart.defaults.global.defaultFontSize,
    													Chart.defaults.global.defaultFontStyle, 
    													Chart.defaults.global.defaultFontFamily);
					ctx.fillStyle = 'purple';
					ctx.textAlign = 'center';
					ctx.textBaseline = 'bottom';

					this.data.datasets.forEach(function (dataset, i) {
						var meta = chartInstance.controller.getDatasetMeta(i);
						meta.data.forEach(function (bar, index) {
							var data = dataset.data[index];							
							ctx.fillText(data, bar._model.x, bar._model.y - 5);
						});
					});
				}
    		},
    		legend: {
    			display: true
    		},
    		scales: {
	    	 yAxes: [{
	    	  ticks: {
	    	  	stepSize : 100,
	    	    beginAtZero: true
		    	     },
    	      gridLines: {
	          display: false
       				 }
			      }],
		      xAxes: [{	    	  	
    	      gridLines: {
	          display: true
       				 }
			      }],

		       }
    	}
	});


	//일산화 그래프
	var Mq7ctx = document.getElementById('Mq7chart');

	var Mq7chart = new Chart(Mq7ctx, {
		type : 'line',
    	data : {
    		labels: timeArray,
    		datasets: [{
    			label: '일산화탄소 농도',
    			data: Mq7Array,
    			backgroundColor: 'transparent',
    			borderColor: 'rgba(75, 192, 192, 1)',
    			borderWidth: 1,
    			pointBackgroundColor: 'rgb(75, 192, 192)'
    		}]
    	},
    	options: {
    		maintainAspectRatio: false,
    		tooltips: {
    			enabled: false
    		},
    		hover: {
    			animationDuration: 0
    		},
    		animation: {
    			duration: 1,
    			onComplete: function () {
    				var chartInstance = this.chart,
    				ctx = chartInstance.ctx
    				ctx.font = Chart.helpers.fontString(Chart.defaults.global.defaultFontSize,
    													Chart.defaults.global.defaultFontStyle, 
    													Chart.defaults.global.defaultFontFamily);
					ctx.fillStyle = 'rgb(75, 192, 192)';
					ctx.textAlign = 'center';
					ctx.textBaseline = 'bottom';

					this.data.datasets.forEach(function (dataset, i) {
						var meta = chartInstance.controller.getDatasetMeta(i);
						meta.data.forEach(function (bar, index) {
							var data = dataset.data[index];							
							ctx.fillText(data, bar._model.x, bar._model.y - 5);
						});
					});
				}
    		},
    		legend: {
    			display: true
    		},
    		scales: {
	    	 yAxes: [{
	    	  ticks: {
	    	  	stepSize : 100,
	    	    beginAtZero: true
		    	     },
    	      gridLines: {
	          display: false
       				 }
			      }],
		      xAxes: [{	    	  	
    	      gridLines: {
	          display: true
       				 }
			      }],

		       }
    	}
	});

	//온습도 그래프
	var tempHumictx = document.getElementById('tempHumichart');

	var tempHumiData = {
		labels : timeArray,
		datasets: [{
    		label: '온도',
    		data: tempArray,
    		backgroundColor: 'transparent',
    		borderColor: 'rgb(255, 99, 132)',
    		borderWidth: 3,
    		pointBackgroundColor: 'red'
    	},
    	{
    		label: '습도',
    		data: humiArray,
    		backgroundColor: 'transparent',
    		borderColor: 'rgb(54, 162, 235)',
    		borderWidth: 3,
    		pointBackgroundColor: 'blue'
    	}]

	};

	var tempHumitchart = new Chart(tempHumictx, {
    	type: 'line',
    	data: tempHumiData,
    	options: {
    		maintainAspectRatio: false,
    		tooltips: {
    			enabled: false
    		},
    		hover: {
    			animationDuration: 0
    		},
    		animation: {
    			duration: 1,
    			onComplete: function () {
    				var chartInstance = this.chart,
    				ctx = chartInstance.ctx
    				ctx.font = Chart.helpers.fontString(Chart.defaults.global.defaultFontSize,
    													Chart.defaults.global.defaultFontStyle, 
    													Chart.defaults.global.defaultFontFamily);
					ctx.fillStyle = 'black';
					ctx.textAlign = 'center';
					ctx.textBaseline = 'bottom';

					this.data.datasets.forEach(function (dataset, i) {
						var meta = chartInstance.controller.getDatasetMeta(i);
						meta.data.forEach(function (bar, index) {
							var data = dataset.data[index];							
							ctx.fillText(data, bar._model.x, bar._model.y - 5);
						});
					});
				}
    		},
    		legend: {
    			display: true
    		},
    		scales: {
	    	 yAxes: [{
	    	  ticks: {
	    	  	stepSize : 20,
	    	  	suggestedMax: 100,
	    	    beginAtZero: true
		    	     },
    	      gridLines: {
	          display: false
       				 }
			      }],
		      xAxes: [{	    	  	
    	      gridLines: {
	          display: true
       				 }
			      }],

		       }
    	}
    });   
    
}

invokeAPI();