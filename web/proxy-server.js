var express = require('express');
var app = express();
var https = require('https');

app.get('/', function(req, res){
    if (isBrowser(req)) {
        res.sendfile('./index.html');
    } else {
        res.send(req.connection.remoteAddress);
    }
});
app.get('/s', function(req, res){
    res.sendfile('./search.html');
});
function proxy(req, res) {
    console.log(req.url);
    var proxyReq = https.request({
        host: 'soip.net',
        method: 'POST',
        path: req.url,
    }, function(proxyRes){
        proxyRes.on('data', function(chunk){
            res.write(chunk);
        });
        proxyRes.on('end', function(){
            res.end();
        });
    });
    proxyReq.on('error', function(e){console.log(e)});
    proxyReq.end();
}
app.post('/s', proxy); 
app.post('/whois', proxy);
app.post('/myip', proxy);

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

app.listen(3000, '127.0.0.1');
console.log('Listening on port 3000');
