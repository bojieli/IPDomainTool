var readline = require('readline');
var config = require('../config');
var r = require('rethinkdb');
r.connect(config.rethinkdb,
    function(err, conn) {
        if (err) {
            console.log(err);
            process.exit();
        }
        onDbConnect(conn);
    });

function getMaskLen(num) {
    var n = 1, len = 32;
    while (n < num) {
        n *= 2;
        --len;
    }
    return len;
}

function parseDate(str) {
    if (str.length != 8)
        return new Date('1970-01-01 UTC');
    else {
        var formal = str.substr(0,4) + '-' + str.substr(4,2) + '-' + str.substr(6,2) + ' UTC';
        return new Date(formal);
    }
}


function onDbConnect(rconn) {

var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
});

var pending = 0;
var finished = false;
function cb(err,data){
    if (err) throw err;
    if (--pending < config.master.maxPending)
        rl.resume();
    if (pending == 0 && finished)
        process.exit();
}

function flushInsert() {
    if (++pending >= config.master.maxPending)
        rl.pause();
    process.stdout.write("total " + total + "  DB pending " + pending);

    r.table('subnet').insert(subnets, {upsert: true}).run(rconn, cb);
    subnets = [];

    process.stdout.write(".\n");
}

console.log('Ready.');
var total = 0;
var subnets = [];
rl.on('line', function(line) {
try {
    var splits = line.split('|');
    if (splits.length < 6)
        return;
    var data = {
        registry: splits[0],
        country: splits[1],
        protocol: splits[2],
        subnet: splits[3],
        masklen: getMaskLen(parseInt(splits[4])),
        regdate: parseDate(splits[5]),
    }
    if (data.protocol != 'ipv4') // only IPv4 records are processed
        return;
    delete data.protocol;
    if (data.masknum <= 0 || !data.subnet.match(/^[0-9.]+$/)) {
        console.log("Invalid line: " + line);
        return;
    }
    subnets.push(data);

    // bulk insert
    if (++total % 10000 == 0) {
        flushInsert();
    }
}catch(e){
    console.log(e);
}
});

rl.on('close', function(){
    flushInsert();
    finished = true;
});

}
