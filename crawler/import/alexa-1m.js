var readline = require('readline');
var maxPending = require('../config').master.maxPending;
if (maxPending < 1)
    process.exit();
var finished = false;

var r = require('rethinkdb');
r.connect(require('../config').rethinkdb,
    function(err, conn) {
        if (err) {
            console.log(err);
            process.exit();
        }
        importAlexa(conn);
    });

function importAlexa(conn){
    var pending = 0;
    function cb(err, data){
        if (err) {
            console.log(err);
            process.exit();
        }
        process.stdout.write('.');
        --pending;
        if (pending < maxPending)
            rl.resume();
        if (pending == 0 && finished)
            process.exit();
    }

    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false,
    });
    console.log('Ready.');
    var total = 0;
    var queue = [];
    rl.on('line', function(line) {
        var splits = line.split(',');
        if (splits.length != 2) {
            console.log("Invalid line: " + line);
            return;
        }
        var rank = parseInt(splits[0]);
        var domain = splits[1].toLowerCase();
        if (!domain.match(/^[a-z0-9-]+(\.[a-z]+)+$/)) {
            // console.log("Invalid domain: " + domain);            
            return;
        }
        queue.push({domain: domain, rank: rank});
        if (++total % 10000 == 0) {
            ++pending;
            r.table('alexa').insert(queue, {upsert: true}).run(conn, cb);
            if (pending >= maxPending) {
                rl.pause();
            }
            queue = [];
        }
    });
    rl.on('close', function(line) {
        if (queue.length > 0) {
            ++pending;
            r.table('alexa').insert(queue, {upsert: true}).run(conn, cb);
        }
        finished = true;
    });
}
