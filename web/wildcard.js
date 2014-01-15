var net = require('net');
var sock = new net.Socket();
var config = require('./config').wildcard;

sock.connect(config.port, config.host, function(){
    console.log("wildcard socket connected");
});

var queryQueue = {};

sock.on('data', function(data){
    var lines = data.toString().split("\n");
    for (var i in lines){
        if (lines[i] == "")
            continue;
        var cols = lines[i].split('$');
        if (cols.length < 3) {
            console.log("wildcard: invalid line: " + lines[i]);
            continue;
        }
        var query = cols[0] + '$' + cols[1] + '$' + cols[2];
        var results = cols.slice(3);
        if (!queryQueue[query]) {
            console.log("wildcard query not exist: " + query);
            continue;
        }
        for (var j in queryQueue[query]) {
            queryQueue[query][j](null, results);
        }
        delete queryQueue[query];
    }
});
sock.on('close', function(){
    console.log("socket closed, reconnect...");
    sock.connect(config.port, config.host);
});

exports.search = function(pattern, skip, limit, cont){
    var query = skip + '$' + limit + '$' + pattern;
    if (queryQueue[query]) {
        queryQueue[query].push(cont);
    } else {
        sock.write(query + "\n", function(err){
            if (err)
                cont(err);
            else
                queryQueue[query] = [cont];
        });
    }
}
