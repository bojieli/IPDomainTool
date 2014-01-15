
var express = require('express');
var app = express();
app.use(express.bodyParser());
var conf = require('./config');

app.listen(conf.pingMaster.port, conf.pingMaster.host);

var jobQueue = [];
var pending = {};
var data = {};

app.post('/ping/getnext', function(req, res){
    if (jobQueue.length == 0)
        res.send(404);
    else
        res.send(JSON.stringify(jobQueue.pop()));
});

function clientRealIP(req){
    if (req.get('X-Real-IP'))
        return req.get('X-Real-IP');
    else
        return req.connection.remoteAddress;
}

app.post('/ping/data', function(req, res){
try{
    if (!req.body.action || !req.body.host){
        res.send(400);
        return;
    }
    var job = {action: req.body.action, host: req.body.host};
    if (job.action == "traceroute")
        job.ttl = req.body.ttl;
    var key = JSON.stringify(job);
    if (!pending[key]) {
        res.send(404);
        return;
    }

    job.ok = req.body.ok ? true : false;
    job.time = req.body.time;
    job.source = clientRealIP(req);
    if (job.action == "traceroute"){
        job.hops = JSON.parse(req.body.hops);
    }
    else if (job.action == "resolve"){
        job.addresses = JSON.parse(req.body.addresses);
    }
    res.send(200);

    pending[key].pop().send(JSON.stringify(job));
}catch(e){}
});

exports.query = function(action, host, res){
    var job = {action: action, host: host};
    if (action == "traceroute")
        job.ttl = 30;
    var key = JSON.stringify(job);
    if (pending[key])
        pending[key].push(res);
    else
        pending[key] = [res];

    jobQueue.push(job);
}
