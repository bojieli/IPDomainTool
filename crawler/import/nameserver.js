var readline = require('readline');
var r = require('rethinkdb');
r.connect(require('../config').rethinkdb,
    function(err, conn) {
        if (err) {
            console.log(err);
            process.exit();
        }
        importNS(conn);
    });

if (!process.argv[2]) {
    console.log("Please specify TLD (COM, NET...)");
    process.exit();
}
var tld = process.argv[2].toUpperCase();

console.log('waiting...');

function importNS(rconn){

var maxPending = 100;
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
        rl.resume();
    if (pending == 0 && finished)
        process.exit();
}

setInterval(function(){console.log("total " + total + " (*" + bulkSize + ") pending " + pending)}, 1000);

var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
});

console.log('Ready.');

function fqdn(domain) {
    if (domain[domain.length - 1] == '.')
        return domain.slice(0, domain.length-1); // remove trailing "."
    else
        return domain + '.' + tld; // append TLD to form FQDN
}

var lastDomain = null;
var nameservers = [];
rl.on('line', function(line) {
try{
    // only top level domains are matched
    var capture = line.match(/^([A-Z0-9.-]+)\s+NS\s+([A-Z0-9.-]+)$/);
    if (!capture)
        return;
    var domain = fqdn(capture[1]).toLowerCase();
    var nameserver = fqdn(capture[2]).toLowerCase();

    if (domain == lastDomain) {
        nameservers.push(nameserver);
    } 
    else if (lastDomain != null) {
        bulk.push({domain: lastDomain, ns: nameservers});
        nameservers = [nameserver];

        if (bulk.length >= bulkSize) {
            r.table('ns').insert(bulk, {upsert: true}).run(rconn, cb);
            bulk = [];
            if (++pending >= maxPending) {
                rl.pause();
            }
        }
    }
    lastDomain = domain;
}catch(e){
    console.log(e);
}
});

rl.on('close', function(){
    bulk.push({domain: lastDomain, ns: nameservers});
    r.table('ns').insert(bulk, {upsert: true}).run(rconn, cb);
    finished = true;
});

}
