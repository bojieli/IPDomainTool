var readline = require('readline');
var r = require('rethinkdb');
var rconn;
r.connect(require('../config').rethinkdb,
    function(err, conn) {
        if (err) {
            console.log(err);
            process.exit();
        }
        rconn = conn;
    });

var mongo = require('./dbConnect').mongo(require('../config').db);

function importIP(){

var maxPending = 10;
var pending = 0;
var finished = false;
var total = 0;
var bulk = [];
var bulkSize = 1000;

function cb(err, data){
    if (err) {
        console.log(err);
        process.exit();
    }
    ++total;
    --pending;
    if (pending < maxPending)
        next(); // resume
    if (pending == 0 && finished)
        process.exit();
}

setInterval(function(){console.log("total " + total + " (*" + bulkSize + ") pending " + pending)}, 1000);

console.log('Ready.');

var cursor = mongo.collection('domains').find({}, {_id:0, domain:1, ip:1});
var lastDomain = null;
var nameservers = [];
function next(){
    cursor.nextObject(function(err, data){
        if (err) throw err;
        bulk.push(data);
    
        if (bulk.length >= bulkSize) {
            r.table('ip').insert(bulk, {upsert: true}).run(rconn, cb);
            bulk = [];
            if (++pending >= maxPending) {
                return; // sleep a moment
            }
        }
        setTimeout(next, 0); // avoid recursion
    });
}
next();

}
setTimeout(importIP, 2000);
