exports.db = {
    host: 'whois',
    port: 27017,
    name: 'soip',
    user: 'soip-web',
    pass: 'flcisoIvRAP15YDPdowE4GJ0CwZo'
};

exports.rethinkdb = {
    host: 'whois',
    port: 28015,
    db: 'soip'
};

exports.dbFullText = {
    host: 'mirrors.ustc.edu.cn',
    port: 38194,
    name: 'soip',
    user: 'whois-crawler',
    pass: 'sqBofngUpwy3AhiXd9Vy',
};

exports.server = {
    host: '127.0.0.1',
    port: 3000
};

exports.master = {
    debug: false,
    maxPending: 10,

    responseTimeout: 3600,

    ipBulkSize: 200,
    ipNodes: 5,
    ipTimeout: 180,

    whoisBulkSize: 1000,
    saveProgressInterval: 1000,
};

exports.limits = {
    defaultLimit: 10,
    maxLimit: 100,
    domainNumInListing: 10,
};

exports.regex = {
    domain: /^[a-z0-9-]+(\.[a-z]+)+$/,
    email: /^[a-z0-9.+_-]+@[a-z0-9.-]+/i,
};

exports.wildcard = {
    host: 'soip-wildcard',
    port: 7000
};

exports.pingMaster = {
    host: '::',
    port: 6000,
    nodes: 20,
};
