var express = require('express');
var app = express();

app.use(express.bodyParser());

var config = require('../config');
if (!config.master || !config.db)
    console.log("config file error!");
var dbFullText = require('./dbConnect').mongo(config.dbFullText);

var regex = config.regex;

var domainQueue = [];
var delegates = [];

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

function debugPrint(msg) {
    if (config.master.debug)
        console.log(msg);
}

function parseIPWhois(text) {
    var data = {};
try {
    var capture = text.match(regex.email);
    data['Email'] = capture ? capture[0] : '';
    capture = text.match(/(Tel|Phone)([^0-9+])*([0-9.+ -]+)/i);
    data['Phone'] = capture ? capture[3] : '';
    capture = text.match(/(Fax)([^0-9+])*([0-9.+ -]+)/i);
    data['Fax'] = capture ? capture[3] : '';
    capture = text.match(/(descr|org)[^:]*:([^\r\n]+)/i);
    data['Organization'] = capture ? capture[2].replace(/^\s+/, '').replace(/\s+$/, '') : '';
    capture = text.match(/person[^:]*:([^\r\n]+)/i);
    data['Person'] = capture ? capture[1].replace(/^\s+/, '').replace(/\s+$/, '') : '';
    address = text.match(/address[^:]*:([^\r\n]+)/i);
    data['Address'] = capture ? capture[1].replace(/^\s+/, '').replace(/\s+$/, '') : '';
    return data;
} catch(e) {
    console.log(e);
    return data;
}
}

var dataTotal = 0;
app.post("/ipwhois/data", function(req, res){
    ++dataTotal;
    if (typeof req.body.ip == "string" && typeof req.body.whois == "string") {
        debugPrint("/ipwhois/data " + req.body.ip);
        var toinsert = parseIPWhois(req.body.whois);
        r.table('subnet').get(req.body.ip).update(toinsert).run(rconn, cb);

        dbFullText.collection('ipwhois').update(
            {subnet: req.body.ip},
            {$set: {whoisText: req.body.whois}},
            {upsert: true}
        );
        res.send(200);
    }
    else {
        res.send(400);
    }
});

function doSend(res, data){
    res.send(data);
}

app.post('/ipwhois/getnext', function(req, res){
    if (domainQueue.length > 0){
        doSend(res, domainQueue.pop());
    } else {
        delegates.push(res);
    }
});

function onRethinkDBConnect(){
    var total = 0;
    r.table('subnet').run(rconn, function(err,cursor){
        if (err) throw err;
        function getnext(){
            cursor.next(function(err,line){
                if (err) throw err;
                ++total;
                domainQueue.push(line.subnet);
                while (domainQueue.length > 0 && delegates.length > 0)
                    doSend(delegates.pop(), domainQueue.pop());
                if (cursor.hasNext())
                    setTimeout(getnext, 0);
            })
        }
        getnext();
    });

    setInterval(function(){
        console.log("received data " + dataTotal + ", getnext: loaded " + total + " domainQueue " + domainQueue.length + " delegates " + delegates.length);
    }, 2000);

    var port = process.argv[2] ? process.argv[2] : 5000;
    app.listen(port, '127.0.0.1');
    console.log('Listening on port ' + port);
}
