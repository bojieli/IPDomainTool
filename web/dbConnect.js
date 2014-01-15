var MongoDb = require('mongodb').Db;
var MongoServer = require('mongodb').Server;
var pg = require('pg');

exports.mongoConnect = function(dbconf) {
    var db = new MongoDb(dbconf.name, new MongoServer(dbconf.host, dbconf.port, {auto_reconnect: true}, {}), {w:0, native_parser: false});
    db.open(function(err, dbh){
        if (err) {
            console.log(err);
            process.exit();
        }
        else if (typeof dbconf.user == "string")
            dbh.authenticate(dbconf.user, dbconf.pass, function(e){ if(e) { console.log(e); process.exit(); } });
    });
    return db;
};

exports.dbConnect = exports.mongoConnect; // backwards compatibility

exports.pgConnect = function(dbconf) {
    var conString = "postgres://" + dbconf.user + ':' + dbconf.pass
        + '@' + dbconf.host + '/' + dbconf.name;
    var client = new pg.Client(conString);
    client.connect(function(err){
        if (err) {
            console.log(err);
            process.exit();
        }
    });
    return client;
}
