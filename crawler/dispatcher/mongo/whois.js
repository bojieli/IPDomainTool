var express = require('express');
var app = express();

app.use(express.bodyParser());

var config = require('../config');
if (!config.master || !config.db)
    console.log("config file error!");
var db = require('./dbConnect').mongo(config.db);

var regex = config.regex;

function debugPrint(msg) {
    if (config.master.debug)
        console.log(msg);
}

function doSend(res, data){
    debugPrint("/whois/getnext " + data);
    res.send(data);
}

var domainQueue = [];
var delegates = [];
var rl; // readline, to be initialized
function triggerDelegates(){
    while (delegates.length > 0 && domainQueue.length > 0) {
        doSend(delegates.pop(), domainQueue.pop());
    }
    if (delegates.length > 0)
        rl.resume();
}

app.post('/whois/getnext', function(req, res){
    if (domainQueue.length > 0){
        doSend(res, domainQueue.pop());
    } else {
        delegates.push(res);
    }
    if (domainQueue.length < config.master.whoisBulkSize)
        rl.resume();
});

setTimeout(function(){
    var port = process.argv[2] ? process.argv[2] : 2000;
    app.listen(port, '127.0.0.1');
    console.log('Listening on port ' + port);

    db.collection('crawler').findOne({option:'whoisDoneCount'}).function(err,data){
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
            if (domainQueue.length >= config.master.whoisBulkSize * 2)
                rl.pause();
            triggerDelegates();

            if (total % config.master.saveProgressInterval == 0){
                db.collection('crawler').insert({option: 'whoisDoneCount', value: total - domainQueue.length}, {upsert: true});
            }
        });

        setInterval(function(){
            console.log("total " + total + " domainQueue " + domainQueue.length + " delegates " + delegates.length);
        }, 2000);
    });
}
