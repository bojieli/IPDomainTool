var readline = require('readline');
var dbconf = require('../config').db;
var db = require('./dbConnect').dbConnect(dbconf);

console.log('waiting...');

// wait 2 seconds for DB connection
setTimeout(function(){
    db.collection('domains').ensureIndex({domain: 1}, {unique: true, dropDups: true});
    db.collection('domains').ensureIndex({ipLastUpdate: 1, ipSpiderNodes: 1, ipLastCrawl: 1});
    db.collection('domains').ensureIndex({whoisLastUpdate: 1, whoisLastCrawl: 1});
    db.collection('domains').ensureIndex({ip: 1});
    db.collection('domains').ensureIndex({nameserver: 1});
    db.collection('domains').ensureIndex({"registrant.Name": 1});
    db.collection('domains').ensureIndex({"registrant.Organization": 1});
    db.collection('domains').ensureIndex({"registrant.Email": 1});
    db.collection('domains').ensureIndex({"whois.createTime": 1});
    db.collection('domains').ensureIndex({"whois.updateTime": 1});
    db.collection('domains').ensureIndex({"whois.expireTime": 1});

    db.collection('crawler').ensureIndex({option: 1});
}, 2000);

setTimeout(function(){

var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
});

console.log('Ready.');
var total = 0;
rl.on('line', function(line) {
    var domain = line.toLowerCase();
    if (!domain.match(/^[a-z0-9-]+\.[a-z]+$/)) {
        //console.log("Invalid line " + domain);
        return;
    }
    db.collection('domains').insert({domain: domain});
    if (++total % 10000 == 0)
        process.stdout.write(total + "\t");
});

}, 5000); // wait 5 seconds for DB connection and index creation
