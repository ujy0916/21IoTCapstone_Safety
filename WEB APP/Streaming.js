//작업자 로그인 정보 (이름값)
var ManagerId = sessionStorage.getItem('ManagerId');

console.log("id="+ManagerId);

const managerId = ManagerId.split("*");
document.getElementById("mangerName").innerHTML = managerId[1];