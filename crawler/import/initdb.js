var r = require('rethinkdb');
r.connect(require('../config').rethinkdb,
    function(err, conn) {
        if (err) {
            console.log(err);
            process.exit();
        }
        createTables(conn);
    });

function cb(data){
    console.log(data);
}

function createTables(conn){
    r.tableCreate('alexa', {primaryKey: 'domain', durability: 'soft'}).run(conn, function(){
        r.table('alexa').indexCreate('rank').run(conn, cb);
    });
    r.tableCreate('ip', {primaryKey: 'domain', durability: 'soft'}).run(conn, function(){
        r.table('ip').indexCreate('ip', {multi: true}).run(conn, cb);
    });
    r.tableCreate('ns', {primaryKey: 'domain', durability: 'soft'}).run(conn, function(){
        r.table('ns').indexCreate('ns', {multi: true}).run(conn, cb);
    });
    r.tableCreate('whois', {primaryKey: 'domain', durability: 'soft'}).run(conn, function(){
        r.table('whois').indexCreate('crawlTime').run(conn, cb);
        r.table('whois').indexCreate('createTime').run(conn, cb);
        r.table('whois').indexCreate('updateTime').run(conn, cb);
        r.table('whois').indexCreate('expireTime').run(conn, cb);
        r.table('whois').indexCreate('registrar').run(conn, cb);
    });
    r.tableCreate('registrant', {primaryKey: 'domain', durability:'soft'}).run(conn, function(){
        r.table('registrant').indexCreate('crawlTime').run(conn, cb);
        r.table('registrant').indexCreate('Email').run(conn, cb);
        r.table('registrant').indexCreate('NameOrOrg', function(reg){ return [reg('Name'), reg('Organization')]}, {multi: true}).run(conn, cb);
    });
    r.tableCreate('subnet', {primaryKey: 'subnet', durability: 'soft'}).run(conn, function(){
        r.table('subnet').indexCreate('crawlTime').run(conn, cb);
        r.table('subnet').indexCreate('regdate').run(conn, cb);
        r.table('subnet').indexCreate('Organization').run(conn, cb);
    });
    r.tableCreate('crawler', {primaryKey: 'option', durability: 'soft'}).run(conn, cb);
}
