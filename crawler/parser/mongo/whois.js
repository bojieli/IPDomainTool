var express = require('express');
var app = express();

app.use(express.bodyParser());

var config = require('../config');
if (!config.master || !config.db)
    console.log("config file error!");

var regex = config.regex;

function debugPrint(msg) {
    if (config.master.debug)
        console.log(msg);
}

var dbFullText = require('./dbConnect').mongo(config.dbFullText);
var db = require('./dbConnect').mongo(config.db);

function isEmpty(obj){
    for (key in obj)
        if (obj[key])
            return false;
    return true;
}

var parser = require('./parser');

var total = 0;
function reqCount(){
    if (++total % 100 == 0)
        process.stdout.write(total + "\t");
}

app.post('/whois/data', function(req, res){
    reqCount();
    if (typeof req.body.domain == "string" && typeof req.body.whois == "string") {
        res.send(200);
        var toinsert = parser.whois(req.body.domain, req.body.whois);
        if (!isEmpty(toinsert)){
            debugPrint("/whois/data " + req.body.domain);
            db.collection('domains').update(
                {domain: req.body.domain.toLowerCase()},
                {$set: {whois: toinsert}},
                {upsert: true}
            );

            if (!req.body.noUpdateFullText) {
                dbFullText.collection('whois').update(
                    {domain: req.body.domain},
                    {$set: {whoisText: req.body.whois}},
                    {upsert: true}
                );
            }
        }
    }
    else {
        res.send(400);
    }
});

app.post('/whois/registrant', function(req, res){
    reqCount();
    if (typeof req.body.domain == "string" && typeof req.body.whois == "string") {
        res.send(200);
        var toinsert = parser.registrant(req.body.domain, req.body.whois);
        if (!isEmpty(toinsert)) {
            debugPrint("/whois/registrant " + req.body.domain);
            db.collection('domains').update(
                {domain: req.body.domain.toLowerCase()},
                {$set: {registrant: toinsert}},
                {upsert: true}
            );

            if (!req.body.noUpdateFullText) {
                dbFullText.collection('whois').update(
                    {domain: req.body.domain},
                    {$set: {whoisRegistrant: req.body.whois}},
                    {upsert: true}
                );
            }
        }
    }
    else {
        res.send(400);
    }
});

setTimeout(function(){
    var port = process.argv[2] ? process.argv[2] : 2001;
    app.listen(port, '127.0.0.1');
    console.log('Listening on port ' + port);
}, 2000);
