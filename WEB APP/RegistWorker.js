//작업자 로그인 정보 (이름값)
var ManagerId = sessionStorage.getItem('ManagerId');

console.log("id="+ManagerId);

const managerId = ManagerId.split("*");
document.getElementById("mangerName").innerHTML = managerId[1];

//입력창에 바로 보이게 하기
$(document).ready(function() {
  $("#phone").keyup(function() {
    $("#WorkerId").text($("#phone").val());
  });  
});

//업로드할 이미지 미리보기
function setThumbnail(event) {
 var reader = new FileReader();
  reader.onload = function(event) {
   var img = document.createElement("img");
    img.setAttribute("src", event.target.result);
     document.querySelector("div#image_container").appendChild(img);
  };

   reader.readAsDataURL(event.target.files[0]);
}

//S3에 이미지 추가
var albumBucketName = "albumBucketName";
var bucketRegion = "bucketRegion";
var IdentityPoolId = "IdentityPoolId";

AWS.config.update({
  region: bucketRegion,
  credentials: new AWS.CognitoIdentityCredentials({
    IdentityPoolId: IdentityPoolId
  })
});

var s3 = new AWS.S3({
  apiVersion: "2006-03-01",
  params: { Bucket: albumBucketName }
});

function addPhoto(albumName) { 
  var files = document.getElementById("photoUpload").files;
  if (!files.length) {
    return alert("Please choose a file to upload first.");
  }
  var file = files[0];
  var fileName = document.getElementById("phone").value + "X" + document.getElementById("workerNameE").value + getExtensionOfFilename(file.name);
  var albumPhotosKey = encodeURIComponent(albumName) + "/";
  var photoKey = albumPhotosKey + fileName;

  var upload = new AWS.S3.ManagedUpload({
    params: {
      Bucket: albumBucketName,
      Key: photoKey,
      Body: file
    }
  });

  function getExtensionOfFilename(filename) {
    var fileLen = filename.length;
    var lastDot = filename.lastIndexOf('.');
    var fileExt = filename.substring(lastDot, fileLen).toLowerCase();

    return fileExt;
  }

  var promise = upload.promise();

  promise.then(
    function(data) {
      
      // //다이나모 DB
    	AWS.config.update({
    	  region: "region",
    	  endpoint: 'endpoint',
    	  // accessKeyId default can be used while using the downloadable version of DynamoDB. 
    	  // For security reasons, do not store AWS Credentials in your files. Use Amazon Cognito instead.
    	  accessKeyId: "accessKeyId",
    	  // secretAccessKey default can be used while using the downloadable version of DynamoDB. 
    	  // For security reasons, do not store AWS Credentials in your files. Use Amazon Cognito instead.
    	  secretAccessKey: "secretAccessKey"
    	});

    	var docClient = new AWS.DynamoDB.DocumentClient();

    	createItem();

    	return alert("작업자 정보가 등록되었습니다.");

    },
    
    function(err) {
      return alert("There was an error uploading your photo: ", err.message);
    }
  );
}


 function createItem() {

  this.getExtensionOfFilename = function(f) {
    var fileLen = f.length;
    var lastDot = f.lastIndexOf('.');
    var fileExt = f.substring(lastDot, fileLen).toLowerCase();

    return fileExt;
  }
 	
	var params = {
        TableName :"WorkerDB",
        Item:{
            "WorkerId": document.getElementById("phone").value,
            "workerNameK": document.getElementById("workerNameK").value,
            "workerNameE": document.getElementById("workerNameE").value,
            "phone": "010"+document.getElementById("phone").value,
            "workerImage": "https://safety-capstone2021.s3.ap-northeast-2.amazonaws.com/peopleImg/" + 
            document.getElementById("phone").value + "X" + document.getElementById("workerNameE").value + getExtensionOfFilename(document.getElementById("photoUpload").files[0].name)
        }
    };


    var docClient = new AWS.DynamoDB.DocumentClient();
    docClient.put(params, function(err, data) {
        if (err) {
           alert("Unable to add item: " + "\n" + JSON.stringify(err, undefined, 2));
        } else {
            //저장 후 모니터링 페이지로 이동
            location.href="ManagerMain.html";
        }
    });
}

