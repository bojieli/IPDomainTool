var parser = require('./parser');

function doTest(domain){
    var pending = 2;
    require('node-whois').lookup(domain, {follow:0}, function(err, data){
        if (err) throw err;
        console.log(parser.whois(domain, data));
        if (--pending == 0)
            process.exit();
    });
    require('node-whois').lookup(domain, function(err, data){
        if (err) throw err;
        console.log(parser.registrant(domain, data));
        if (--pending == 0)
            process.exit();
    });
}

doTest(process.argv[2]);

