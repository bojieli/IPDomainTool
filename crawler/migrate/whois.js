var express = require('express');
var app = express();

app.use(express.bodyParser());

var config = require('../config');
if (!config.master || !config.db)
    console.log("config file error!");

function debugPrint(msg) {
    if (config.master.debug)
        console.log(msg);
}

var dbFullText = require('./dbConnect').mongo(config.dbFullText);

function isEmpty(obj){
    for (key in obj)
        if (obj[key])
            return false;
    return true;
}

var http = require('http');
var querystring = require('querystring');
function postData(path, post_data) {
    var content = querystring.stringify(post_data);
    var req = http.request({
        host: '127.0.0.1',
        port: 80,
        method: "POST",
        path: path,
        headers: {
            'Content-Type':'application/x-www-form-urlencoded',
            'Content-Length': content.length
        },
    });
    req.on('error', function(e){
        console.log("request error (" + path + ") " + e.message);
    });
    req.write(content);
    req.end();
}

var cursor = null;
var total = 0;
function nextBulk(){
    cursor.nextObject(function(err, data) {
        if (err){
            console.log(err);
            process.exit();
        }
        if (++total % 1000 == 0)
            process.stdout.write(total + "\t");

        if (data.whoisText) {
            postData("/whois/data", {
                domain: data.domain,
                whois: data.whoisText,
                noUpdateFullText: true,
            });
        }

        if (data.whoisRegistrant) {
            postData("/whois/registrant", {
                domain: data.domain,
                whois: data.whoisRegistrant,
                noUpdateFullText: true,
            });
        }

        setTimeout(nextBulk, 0); // recursive to iterative
    });

}

setTimeout(function(){
    var skip = 0;
    if (process.argv[2]) {
        skip = parseInt(process.argv[2]);
        console.log("Skipping " + skip);
    }
    total = skip;
    cursor = dbFullText.collection('whois').find({}).sort({_id:1}).skip(skip);
    nextBulk();
}, 2000);
