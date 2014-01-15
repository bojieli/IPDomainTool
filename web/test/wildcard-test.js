var net = require('net');
var sock = new net.Socket();
var begin;
sock.connect(7000, "soip-wildcard.6.freeshell.ustc.edu.cn", function(){
    begin = new Date();;
    console.log("socket connected");
    sock.write("0$10$GOOGLE*.*\n");
    sock.write("10$20$GOOGLE.COM\n");
    sock.write("0$10$BAIDU.COM\n0$10$BAIDU*\n");
    sock.write("0$10$BOJIELI*\n");
});
sock.on('data', function(data){
    console.log(data.toString());
    console.log((new Date()) - begin);
});
