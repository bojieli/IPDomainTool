var Db = require('mongodb').Db;
var Connection = require('mongodb').Connection;
var Server = require('mongodb').Server;
var BSON = require('mongodb').BSON;
var ObjectID = require('mongodb').ObjectID;
var dbconf = require('./config.js').db;
/*
var data = [
    {ip: "123.125.114.144", domain: "baidu", tld: "com", registrant: "Baidu, Inc."},
    {ip: "220.181.111.85", domain: "baidu", tld: "com", registrant: "Baidu, Inc."},
    {ip: "220.181.111.86", domain: "baidu", tld: "com", registrant: "Baidu, Inc."},
    {ip: "173.194.38.142", domain: "google", tld: "com", registrant: "Google, Inc."},
    {ip: "173.194.38.136", domain: "google", tld: "com", registrant: "Google, Inc."},
    {ip: "173.194.38.129", domain: "google", tld: "com", registrant: "Google, Inc."},
    {ip: "173.194.38.133", domain: "google", tld: "com", registrant: "Google, Inc."},
    {ip: "173.194.38.135", domain: "google", tld: "com", registrant: "Google, Inc."},
    {ip: "173.194.38.130", domain: "google", tld: "com", registrant: "Google, Inc."},
    {ip: "173.194.38.128", domain: "google", tld: "com", registrant: "Google, Inc."},
    {ip: "173.194.38.132", domain: "google", tld: "com", registrant: "Google, Inc."},
    {ip: "173.194.38.134", domain: "google", tld: "com", registrant: "Google, Inc."},
    {ip: "173.194.38.131", domain: "google", tld: "com", registrant: "Google, Inc."},
    {ip: "173.194.38.137", domain: "google", tld: "com", registrant: "Google, Inc."},
    {ip: "192.30.252.131", domain: "github", tld: "com", registrant: "GitHub, Inc."},
    {ip: "202.141.160.99", domain: "soip", tld: "net", registrant: "CodeBreaking Team"},
    {ip: "202.141.176.99", domain: "soip", tld: "net", registrant: "CodeBreaking Team"},
    {ip: "202.141.160.99", domain: "rrurl", tld: "net", registrant: "Bojie Li"},
    {ip: "202.141.176.99", domain: "rrurl", tld: "net", registrant: "Bojie Li"},
    {ip: "202.141.160.99", domain: "rev-ip", tld: "com", registrant: "Bojie Li"},
    {ip: "202.141.176.99", domain: "rev-ip", tld: "com", registrant: "Bojie Li"},
    {ip: "202.141.160.99", domain: "dnamer", tld: "net", registrant: "Bojie Li"},
    {ip: "202.141.176.99", domain: "dnamer", tld: "net", registrant: "Bojie Li"},
];
*/

var domains = [];
var ip_domain = [];

function genFakeData(num) {
    for (var i=0; i<num; i++) {
        var tlds = ['com', 'net', 'org', 'info'];
        var data = {
            registrar: 'Registrar #' + parseInt(Math.random() * 10),
            registrantName: 'Registrant #' + parseInt(Math.random() * 1000),
            registrantOrganization: 'Registrant Org #' + parseInt(Math.random() * 100),
            email: parseInt(Math.random() * 10) + 'mail' + parseInt(Math.random() * 100) + '@example.com',
            created: '2013-11-07',
            expires: '2013-12-10',
        };
        for (var j in tlds) {
            var domain = {};
            for (var key in data) {
                domain[key] = data[key];
            }
            domain.domain = i + '.' + tlds[j];
            domains.push(domain);
            var ip = parseInt(Math.random() * 100);
            ip_domain.push({ ip: ip, domain: domain.domain });
            var numip = parseInt(Math.random() * 20);
            for (var k=0; k<numip; k++) {
                ip = parseInt(Math.random() * 4294967296);
                ip_domain.push({ ip: ip, domain: domain.domain });
            }
        }
    }
}
genFakeData(10000);

var db = new Db(dbconf.name, new Server(dbconf.host, dbconf.port, {auto_reconnect: true}, {}), {safe: false});
db.open(function(){
    var total = domains.length + ip_domain.length;
    var finished = 0;
    db.createCollection("domains", function(err, collection){
        // remove all old records and insert new ones
        collection.remove({}, function(){
            for (var idx in domains) {
                collection.insert(domains[idx], function(){
                    finished++;
                    if (finished == total)
                        process.exit();
                });
            }
        });
    });
    db.createCollection("ip_domain", function(err, collection){
        // remove all old records and insert new ones
        collection.remove({}, function(){
            for (var idx in ip_domain) {
                collection.insert(ip_domain[idx], function(){
                    finished++;
                    if (finished == total)
                        process.exit();
                });
            }
        });
    });
});

