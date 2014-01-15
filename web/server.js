var express = require('express');
var app = express();
var conf = require('./config');
var dataProvider = require('./data-mongodb');
var queryChecker = require('./query-checker');
var fs = require('fs');
var pingMaster = require('./ping-master');

function isBrowser(req){
    return (req.headers['user-agent'].indexOf('Mozilla') != -1);
}

function inArray(needle, haystack) {
    for (var i in haystack) {
        if (needle == haystack[i])
            return true;
    }
    return false;
}

function contGen(query, httpResponse) {
    return function(err, data) {
        if (err) {
            httpResponse.send(JSON.stringify({
                ok: 0,
                msg: err.toString()
            }));
            return;
        }
        if (query.match.ip) {
            if (typeof query.match.ip == "number")
                query.match.ip = dataProvider.numericIP2string(query.match.ip);
            else {
                for (key in query.match.ip) {
                    if (typeof query.match.ip[key] == "number")
                        query.match.ip[key] = dataProvider.numericIP2string(query.match.ip[key]);
                }
            }
        }
        console.log(data);
        httpResponse.send(JSON.stringify({
            ok: 1,
            timestamp: new Date(),
            query: query,
            data: data
        }));
    };
}

function parseIPRange(text) {
    if (text.indexOf('/') >= 0) {
        var split = text.split('/');
        return [ipToNumeric(split[0]),
            ipToNumeric(split[0]) + Math.pow(2, 32 - parseInt(split[1])) - 1];
    }
    else if (text.indexOf('-') >= 0) {
        var split = text.split('-');
        return [ipToNumeric(split[0]), ipToNumeric(split[1])];
    }
    else {
        var split = text.split('.');
        var numIP = 0;
        var intervalSize = Math.pow(2, 32);
        for (var i in split) {
            if (split[i] == '*')
                return [numIP * intervalSize,
                    (numIP + 1) * intervalSize - 1];
            numIP = numIP * 256 + parseInt(split[i]);
            intervalSize = intervalSize / 256;
        }
        // fallback, should never reach here
        return [numIP, numIP + intervalSize - 1];
    }
}

function dispatcher(query, httpResponse) {
    var cont = contGen(query, httpResponse);

    if (queryChecker.isIP(query.text)) {
        query.match = {ip: dataProvider.ipToNumeric(query.text)};
    }
    else if (queryChecker.isDomainName(query.text)) {
        query.match = {domain: query.text.toLowerCase()};
    }
    else if (queryChecker.isIPRange(query.text)) {
        var range = parseIPRange(query.text);
        query.match = {ip: {$elemMatch: {$gte: range[0], $lte: range[1]}}};
        if (query.listing == "no")
            query.listing = "ip";
    }
    else if (queryChecker.isDomainWildcard(query.text)) {
        query.match = {domain: {$like: query.text.toLowerCase()}};
        if (query.listing == "no")
            query.listing = "domain";
    }
    else if (queryChecker.isEmail(query.text)) {
        query.match = {email: query.text};
    }
    else if (queryChecker.isEmailWildcard(query.text)) {
        query.match = {email: {$like: query.text}};
        if (query.listing == "no")
            query.listing = "email";
    }
    else if (query.text.match(/^[a-zA-Z0-9-]+$/) && query.text.length >= 4) { // treat as wildcard match
        query.match = {domain: {$like: '*' + query.text.toLowerCase() + '*'}};
        if (query.listing == "no")
            query.listing = "domain";
    }
    else { // registrant exact match
        query.match = {registrant: query.text};
    }

    console.log(query);

    dataProvider.genericQuery(query, cont);
}

function doSearch(res, params){
    var query = { start: 0, count: 0 };

    if (typeof params.count == "string" && params.count.match(/^[0-9]+$/) !== null) {
        query.count = parseInt(params.count);
    }
    if (query.count <= 0)
        query.count = conf.limits.defaultLimit;
    if (query.count > conf.limits.maxLimit)
        query.count = conf.limits.maxLimit;

    if (typeof params.start == "string" && params.start.match(/^[0-9]+$/) !== null) {
        query.start = parseInt(params.start);
    } else {
        query.start = 0;
    }

    query.listing = 'no';
    if (typeof params.listing == "string") {
        var allowedTypes = ['domain', 'ip', 'email', 'registrant'];
        if (inArray(params.listing, allowedTypes))
            query.listing = params.listing;
    }

    if (typeof params.q != "string") {
        res.send(400);
        return;
    }
    query.text = params.q.trim();
    if (!query.text) {
        res.send("Query should not be empty!");
        return;
    }

    dispatcher(query, res);
}

function clientRealIP(req){
    if (req.get('X-Real-IP'))
        return req.get('X-Real-IP');
    else
        return req.connection.remoteAddress;
}

app.get('/', function(req, res){
    if (isBrowser(req)) {
        res.sendfile('./index.html');
    } else {
        res.send(clientRealIP(req) + "\n");
    }
});
app.get('/s', function(req, res){
    res.sendfile('./search.html');
});
app.post('/s', function (req, res) {
    console.log(req.query);
    doSearch(res, req.query);
});
app.post('/whois', function(req, res){
    if (req.params.domain) {
        var query = req.params.domain;
        if (!queryChecker.isDomainName(query)) {
            res.send(400);
            return;
        }
        dataProvider.getDomainWhois(query, contGen(query, res));
    }
    else if (req.params.ip) {
        var query = req.params.ip;
        if (!queryChecker.isIP(query)) {
            res.send(400);
            return;
        }
        dataProvider.getIPWhois(query, contGen(query, res));
    }
    else {
        res.send(400);
    }
});
app.post('/myip', function(req, res){
    var ip = clientRealIP(req);
    var retval = {};
    if (queryChecker.isIP(ip)){
        retval = dataProvider.getGeoLocation(dataProvider.ipToNumeric(ip));
        if (!retval)
            retval = {};
    };
    retval.ip = ip;
    console.log(retval);
    res.send(JSON.stringify(retval));
});
app.post('/ping', function(req, res){
    var action = req.params.action;
    var host = req.params.host;
    pingMaster.query(action, host, res);
});

app.get(/^\/(\w+)\.html$/, function(req, res){
try {
    var file = req.params[0] + '.html';
    if (fs.existsSync(file))
        res.sendfile(file);
    else
        res.send(404);
} catch(e){
    console.log(e);
}
});
app.use('/static', express.static(__dirname + '/static'));

setTimeout(function(){
    app.listen(conf.server.port, conf.server.host);
    console.log('Listening on ' + conf.server.host + ' port ' + conf.server.port);
}, 1000); // wait for DB connection
