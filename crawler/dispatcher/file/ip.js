var express = require('express');
var app = express();

app.use(express.bodyParser());

var config = require('../config');
if (!config.master || !config.db)
    console.log("config file error!");

var regex = config.regex;

var r = require('rethinkdb');
var rconn;
r.connect(config.rethinkdb,
    function(err, conn) {
        if (err) {
            console.log(err);
            process.exit();
        }
        rconn = conn;
        onRethinkDBConnect();
    });

function cb(err, data){
    if (err) {
        console.log(err);
        process.exit();
    }
}

var domainQueue = [];
var domainBulk = [];
var delegates = [];
var rl; // readline

function doSend(res){
    res.send(JSON.stringify(domainBulk.pop()));
}

app.post('/ip/getnext', function(req, res){
    if (domainBulk.length == 0) {
        delegates.push(res);
        rl.resume();
    }
    else doSend(res);
});

function triggerDelegates(){
    while (domainBulk.length > 0 && delegates.length > 0){
        doSend(delegates.pop());
    }
    return (delegates.length > 0);
}

function makeBulk(){
    var bulk = [];
    for (var i=0; i<config.master.ipBulkSize; ++i){
        bulk.push(domainQueue.pop());
    }
    for (var i=0; i<config.master.ipNodes; ++i){
        domainBulk.push(bulk);
    }
}

function onRethinkDBConnect(){
    r.table('crawler').get('ipDoneCount').run(rconn, function(err,data){
        var skip = 0;
        if (!err && data && data.value) {
            skip = parseInt(data.value);
        }

        rl = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout,
            terminal: false,
        });
        console.log('Reading from stdin.');
        var total = 0;
        rl.on('line', function(line){
            var domain = line.trim().toLowerCase();
            if (!domain.match(regex.domain))
                return;
            ++total;
            if (total < skip)
                return;

            domainQueue.push(domain);
            while (domainQueue.length >= config.master.ipBulkSize) {
                makeBulk();
                if (!triggerDelegates()) // still have pending requests?
                    rl.pause();
            }

            if (total % config.master.saveProgressInterval == 0){
                r.table('crawler').insert({option: 'ipDoneCount', value: total - domainQueue.length}, {upsert: true}).run(rconn, cb);
            }
        });
        
        rl.on('close', function(){
            while (domainQueue.length >= config.master.ipBulkSize) {
                makeBulk();
            }
            r.table('crawler').insert({option: 'ipDoneCount', value: 0}, {upsert: true}).run(rconn, cb);
            console.log("Done");
        });

        setInterval(function(){
            console.log("total " + total
                + " domainQueue[" + domainQueue.length + "]"
                + " domainBulk[" + domainBulk.length + "]"
                + " delegates[" + delegates.length + "]");
        }, 2000);

        var port = process.argv[2] ? process.argv[2] : 4000;
        app.listen(port, '127.0.0.1');
        console.log('Listening on port ' + port);
    });
}
