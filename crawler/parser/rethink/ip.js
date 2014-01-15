var express = require('express');
var app = express();
var config = require('../config');

app.use(express.bodyParser());

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

function debugPrint(msg){
    if (config.master.debug)
        console.log(msg);
}

function ip2numeric(str){
    var splits = str.split('.');
    if (splits.length != 4)
        return -1; // error
    
    var num = 0;
    for (var i in splits) {
        num = num * 256 + parseInt(splits[i]);
    }
    return num;
}

var numDomains = 0;
var expired = 0;
var toinsert = [];

function bulkInsert(domain, iparr){
    var ips = {};
    for (var i in iparr)
        ips[iparr[i]] = null;
    var noRepeatArr = [];
    for (var ip in ips) {
        var n = ip2numeric(ip);
        if (n > 0)
            noRepeatArr.push(n);
    }
    if (noRepeatArr.length == 0)
        return;

    ++numDomains;
    
    toinsert.push({domain: domain, ip: noRepeatArr});
    if (toinsert.length >= config.master.ipBulkSize){
        r.table('ip').insert(toinsert, {upsert: true}).run(rconn, cb);
        toinsert = [];
    }
}

var domainCollector = {};

function insertIP(domain, addresses) {
    if (!domainCollector[domain]) {
        domainCollector[domain] = {
            nodes: 0,
            data: [],
            timeout: setTimeout(function(){
                ++expired;
                bulkInsert(domain, domainCollector[domain].data);
                delete domainCollector[domain];
            }, config.master.ipTimeout * 1000)
        };
    }
    var ref = domainCollector[domain];
    if (addresses instanceof Array) {
        for (i in addresses) {
            ref.data.push(addresses[i]);
        }
    }
    ++ref.nodes;
    if (ref.nodes >= config.master.ipNodes) {
        bulkInsert(domain, ref.data);
        clearTimeout(ref.timeout);
        delete domainCollector[domain];
    }
}

setInterval(function(){
    console.log("total requests " + requests + " commitedDomains " + numDomains + " expired " + expired);
}, 2000);

var requests = 0;
app.post('/ip/data', function(req, res){
try {
    ++requests;
    var records = JSON.parse(req.body.data);
    if (!records){
        res.send(400);
        return;
    }
    for (var domain in records) {
        insertIP(domain, records[domain]);
    }
    res.send(200);
}catch(e){
    console.log(e);
}
});

function onRethinkDBConnect(){
    var port = process.argv[2] ? process.argv[2] : 4001;
    app.listen(port, '127.0.0.1');
    console.log('Listening on port ' + port);
}
