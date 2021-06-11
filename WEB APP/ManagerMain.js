//작업자 로그인 정보 (이름값)
var ManagerId = sessionStorage.getItem('ManagerId');

console.log("id="+ManagerId);

const managerId = ManagerId.split("*");
document.getElementById("mangerName").innerHTML = managerId[1];

var invokeAPI = function() {
    //AWS
    var API_URI = 'API URI';
    

    $.ajax(API_URI, {
        method: 'GET',
        contentType: "application/json",

        success: function (data, status, xhr) {                
                var result = JSON.parse(data);
                

                checkData(result);

                console.log("data="+data);
        },
        error: function(xhr,status,e){
                alert("error");
        }
    });
};

var checkData = function(result) {
    var workerSection = result.MatchingDB_data[0].workSection;
    console.log(workerSection);

    var size = Object.keys(result.MatchingDB_data).length;//json 요소 크기

    var Mq4 = new Array(0,0,0);
    var Mq7 = new Array(0,0,0);
    var temp = new Array(0,0,0);
    var humidity = new Array(0,0,0);
    var count = new Array(0,0,0);
    

    for(var i=0; i<size; i++) {
    	if(result.MatchingDB_data[i].workSection == "A1") {
    		Mq4[0] += parseInt(result.MatchingDB_data[i].Mq4);
    		console.log(Mq4[0]);
			Mq7[0] += parseInt(result.MatchingDB_data[i].Mq7);
			temp[0] += parseInt(result.MatchingDB_data[i].temperature);
			humidity[0] += parseInt(result.MatchingDB_data[i].humidity);
			count[0] += 1;
			console.log("count[0] "+count[0]);
    	}
    	else if(result.MatchingDB_data[i].workSection == "A2") {
    		Mq4[1] += parseInt(result.MatchingDB_data[i].Mq4);
			Mq7[1] += parseInt(result.MatchingDB_data[i].Mq7);
			temp[1] += parseInt(result.MatchingDB_data[i].temperature);
			humidity[1] += parseInt(result.MatchingDB_data[i].humidity);
			count[1] += 1;
    	}
    	else if(result.MatchingDB_data[i].workSection == "A3") {
    		Mq4[2] += parseInt(result.MatchingDB_data[i].Mq4);
			Mq7[2] += parseInt(result.MatchingDB_data[i].Mq7);
			temp[2] += parseInt(result.MatchingDB_data[i].temperature);
			humidity[2] += parseInt(result.MatchingDB_data[i].humidity);
			count[2] += 1;
    	}
    }

    for(i=0; i<Mq4.length; i++) {
    	Mq4[i] /= count[i];
		Mq7[i] /= count[i];
		temp[i] /= count[i];
		humidity[i] /= count[i];
    }

    console.log(Mq4[0]);

    // *********메탄 그래프**************
    var Mq4ctx = document.getElementById('Mq4chart');
    var Mq4chart = new Chart(Mq4ctx, {
    	type : 'bar',
    	data : {
    		labels: ['A1', 'A2', 'A3'],
    		datasets: [{
    			label: '구역별 메탄가스 농도 평균',
    			data: Mq4,
    			backgroundColor: [
    				'rgba(153, 102, 255, 0.2)',
    				'rgba(153, 102, 255, 0.2)',
    				'rgba(153, 102, 255, 0.2)'
    			],
    			borderColor: [
	    			'rgba(153, 102, 255, 1)',
	    			'rgba(153, 102, 255, 1)',
	    			'rgba(153, 102, 255, 1)'
    			],
    			borderWidth: 1
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
    				ctx.font = Chart.helpers.fontString(Chart.defaults.global.defaultFontSize, Chart.defaults.global.defaultFontStyle, Chart.defaults.global.defaultFontFamily);
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
	          display: false
       				 }
			      }],

		       }
		    }
    });


    // *********일산화탄소 그래프**************
    var Mq7ctx = document.getElementById('Mq7chart');
    var Mq7chart = new Chart(Mq7ctx, {
    	type : 'bar',
    	data : {
    		labels: ['A1', 'A2', 'A3'],
    		datasets: [{
    			label: '구역별 일산화탄소 농도 평균',
    			data: Mq7,
    			backgroundColor: [
    				'rgba(75, 192, 192, 0.2)',
    				'rgba(75, 192, 192, 0.2)',
    				'rgba(75, 192, 192, 0.2)'
    			],
    			borderColor: [
	    			'rgba(75, 192, 192, 1)',
	    			'rgba(75, 192, 192, 1)',
	    			'rgba(75, 192, 192, 1)'
    			],
    			borderWidth: 1
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
	          display: false
       				 }
			      }],

		       }
		    }
    });

    // *********온습도 그래프**************
    var tempHumictx = document.getElementById('tempHumichart');

    var tempHumiData = {
    	labels: ['A1', 'A2', 'A3'],
    	datasets: [{
    		label: '구역별 온도 평균',
    		data: temp,
    		backgroundColor: 'transparent',
    		borderColor: 'rgb(255, 99, 132)',
    		borderWidth: 3,
    		pointBackgroundColor: 'red'
    	},
    	{
    		label: '구역별 습도 평균',
    		data: humidity,
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

//API 가져오기
invokeAPI();

//5분 후에 그래프 다시 그리기
var retryAPI = setInterval(function() {
    invokeAPI();
}, 300000);

//Timer
var SetTime = 300;  //60초 = 1분
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
        SetTime = 300;
    }
}

$("#resetButton").click(function reset() {
    clearInterval(retryAPI);
    clearInterval(retryTimer);
    invokeAPI();
    setInterval(function() {
        invokeAPI();
    }, 300000);
    SetTime = 300;
    setInterval(function() {
        msg_time();
    }, 1000);

});