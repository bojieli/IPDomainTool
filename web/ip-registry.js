
var db = require('./dbConnect').mongoConnect(require('./config').db);
var subnets = {}; // indexed by beginIP

exports.get = function(ip){
    var divisor = 1;
    while (ip > 0) {
        ip = ip - ip % divisor;
        if (subnets[ip])
            return subnets[ip];
        divisor *= 2;
    }
    return null;
};

setTimeout(function(){
    db.collection('subnets').find().toArray(function(err, data){
        if (err) {
            console.log("Failed to initialize subnets data: " + err);
            process.exit();
        }
        for (var i in data) {
            subnets[data[i].beginIP] = data[i];
        }
        console.log("Loaded " + data.length + " subnets");
    });
}, 1000); // wait DB connection
