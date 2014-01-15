
var geoip = require('./geoip');
if (typeof geoip != "object") {
    console.log("failed to load geoip library");
    process.exit();
}
var ipRegistry = require('./ip-registry');

var conf = require('./config');
var dbLib = require('./dbConnect');
var db = dbLib.mongoConnect(conf.db);
var dbFullText = dbLib.mongoConnect(conf.dbFullText);
//var dbWildcard = dbLib.pgConnect(conf.dbWildcard);
var wildcard = require('./wildcard');

function ipToNumeric(str) {
    var split = str.split('.');
    var numIP = 0;
    for (var i in split) {
        numIP = numIP * 256 + parseInt(split[i]);
    }
    return numIP;
}
exports.ipToNumeric = ipToNumeric;

function numericIP2string(ip) {
    var nums = [0,0,0,0];
    for (var i=0; i<4; i++) {
        nums[3 - i] = ip % 256;
        ip = parseInt(ip / 256);
    }
    return nums.join('.');
}
exports.numericIP2string = numericIP2string;

exports.getDomainWhois = function(domain, cont) {
    dbFullText.collection('subnets').findOne({domain: domain},
        function(err, data){
            if (err) {
                console.log(err);
                cont(err);
                return;
            }
            if (!data)
                cont("Not Found");
            else
                cont(null, data);
        });
}

exports.getIPWhois = function(ip, cont) {
    db.collection('subnets').find({endIP: {$gte: ipToNumeric(ip)}}, {subnet:1}).sort({endIP: 1})
        .limit(1).toArray(function(err, data){
            if (err) {
                console.log(err);
                cont(err);
                return;
            }
            if (data.length == 0) {
                cont("Not Found");
                return;
            }
            dbFullText.collection('subnets').findOne({subnet: data.subnet},
                function(err, data){
                    if (err) {
                        console.log(err);
                        cont(err);
                        return;
                    }
                    cont(null, data);
                });
        });
}

function min(a,b){
    return a<b?a:b;
}

function matchCondMap(field, val){
    switch (field) {
        case "ip": return {ip: val};
        case "domain": return {domain: val};
        case "email": return {"registrant.Email": val};
        case "registrant": return {$or: [
                {"registrant.Name": val},
                {"registrant.Organization": val}
            ]};
    }
}

function getBriefFromList(field, valList, options, cont){
    var pending = 0;
    var results = {};
    var totalLen = valList.length;
    for (var i = options.start;
        i < min(options.start + options.count, totalLen);
        ++i) {
        var val = valList[i];
        if (field == "ip") {
            val = parseInt(val);
            results[val] = geoip.getLocationSync(val);
            try {
                results[val].organization = ipRegistry.get(val).whois.Organization;
            }catch(e){}
        } else {
            results[val] = {};
        }

        ++pending;
        (function(val){
        var filter = {domain: 1, _id: 0};
        if (field == "email" || field == "registrant"){
            filter.whois = 1;
        }
        db.collection('domains').find(matchCondMap(field, val), {domain: 1, _id: 0})
            .limit(conf.limits.domainNumInListing + 1) // +1 for hasMoreDomains
            .toArray(function(err, data){
                if (err) {
                    console.log(err);
                    cont(err);
                    return;
                }

                if ((field == "email" || field == "registrant") && data[0] && data[0].whois){
                    var whois = data[0].whois;
                    results[val] = {
                        name: whois.Name,
                        organization: whois.Organization,
                        email: whois.Email,
                        city: whois.City,
                        country: whois.Country,
                    };
                }

                if (data.length > conf.limits.domainNumInListing) {
                    results[val].hasMoreDomains = true;
                    --data.length;
                }
                else {
                    results[val].hasMoreDomains = false;
                }

                results[val].domains = [];
                for (var i in data) {
                    results[val].domains.push(data[i].domain);
                }

                if (--pending == 0) {
                    if (field == "ip") { // numeric to string
                        var retval = {};
                        for (var numericIP in results) {
                            retval[numericIP2string(numericIP)] = results[numericIP];
                        }
                        cont(null, retval);
                    }
                    else {
                        if (field == "email") {
                            for (var email in results)
                                if (!email.match(conf.regex.email))
                                    delete results[email];
                        }
                        cont(null, results);
                    }
                }
            });
        })(val);
    }
}

var filterColumnMap = {
    ip: {ip: 1, _id: 0},
    domain: {domain: 1, _id: 0},
    email: {"registrant.Email": 1, _id: 0},
    registrant: {"registrant.Name": 1, "registrant.Organization": 1, _id: 0},
};

function getBriefRecursive(field, cond, options, currLimit, cont){
    var results = {};
    console.log(field, cond, options, currLimit);
    db.collection('domains').find(cond, filterColumnMap[field])
        .limit(currLimit)
        .toArray(function(err, data){
            if (err) {
                console.log(err);
                cont(err);
                return;
            }
            for (var i in data) {
                switch (field) {
                    case "ip":
                    var arr = data[i].ip;
                    for (var j in arr) {
                        results[arr[j]] = null;
                    }
                    break;

                    case "email":
                    results[data[i].registrant.Email] = null;
                    break;

                    case "registrant":
                    var reg = data[i].registrant;
                    var name = reg.Organization.trim() ? reg.Organization : reg.Name;
                    results[name] = null;
                    break;

                    default:
                    console.log("Unexpected field " + field + " in getBriefRecursive");
                    cont(500);
                    return;
                }
            }
            var ipList = [];
            for (var ip in results) {
                ipList.push(ip);
            }
            // If all matched domains has been fetched,
            // or we have got enough distinct IPs, stop.
            if (data.length < currLimit
                || ipList.length >= options.start + options.count + 1) {
                getBriefFromList(field, ipList, options, cont);
            }
            else { // try get more domains for unique IP
                getBriefRecursive(field, cond, options, currLimit * 2, cont);
            }
        });
}

function genPackResult(options, cont){
    return function packResult(err, results) {
        if (err) {
            cont(err);
            return;
        }
        var counter = 0;
        var key;
        for (key in results)
            ++counter;

        var retval = {
            start: options.start,
            count: counter,
            hasMore: (counter > options.count),
            results: results,
        };
        if (retval.hasMore) {
            --retval.count;
            delete results[key]; // delete last element
        }
        cont(null, retval);
    }
}

function getBriefFactory(field){
    return function(match, options, cont){
        var packResult = genPackResult(options, cont);
        if (match[field] && typeof match[field] == "object" && match[field]["$in"]) {
            getBriefFromList(field, match[field]["$in"], options, packResult);
        } else {
            var currLimit = options.start + options.count + 1;
            getBriefRecursive(field, match, options, currLimit, packResult);
        }
    };
}

function ipRange2CIDR(beginIP, endIP) {
    var diff = endIP - beginIP + 1;
    var masklen = 32;
    while (diff > 1) {
        --masklen;
        diff = parseInt(diff / 2);
    }
    return numericIP2string(beginIP) + '/' + masklen;
}
exports.ipRange2CIDR = ipRange2CIDR;

var getIPBrief = getBriefFactory("ip");

function getIPDetail(ip, options, cont){
    var results = {};
    var reg = ipRegistry.get(ip);
    if (reg) {
        results.registry = {
            subnetBegin: numericIP2string(reg.beginIP),
            subnetEnd: numericIP2string(reg.endIP),
            CIDR: ipRange2CIDR(reg.beginIP, reg.endIP),
            registry: reg.registry,
            regdate: reg.regdate
        };
        results.whois = reg.whois;
    } else {
        results.registry = null;
        results.whois = null;
    }
    results.location = geoip.getLocationSync(ip);
    getDomainBrief({ip: ip}, options, function(err, data){
        if (err) {
            console.log(err);
            cont(err);
            return;
        }
        results.domains = data;
        cont(null, results);
    });
}

function initResults(data, options){
    var results = {};
    results.hasMore = (data.length > options.count);
    if (results.hasMore)
        --data.length; // delete last element, it is used to generate hasMore flag
    results.start = options.start;
    results.count = data.length;
    results.results = {};
    return results;
}

function getDomainBrief(match, options, cont){
    db.collection('domains').find(match)
        .skip(options.start).limit(options.count + 1)
        .toArray(function(err, data){
            if (err) {
                console.log(err);
                cont(err);
                return;
            }
            var results = initResults(data, options);
            for (var i in data) {
                var d = data[i];
                var obj = {};
                if (d.whois) {
                    obj.registerTime = d.whois.createTime;
                }
                if (d.registrant) {
                    obj.registrantName = d.registrant.Name;
                    obj.registrantOrganization = d.registrant.Organization;
                    obj.registrantEmail = d.registrant.Email;
                }
                obj.ip = d.ip;
                if (d.ip && d.ip.length > 0) {
                    ipInfo = geoip.getLocationSync(d.ip[0]);
                    obj.ipGeoCity = ipInfo.city;
                    obj.ipGeoCountry = ipInfo.country;
                    try {
                        obj.ipOrganization = ipRegistry.get(ip).whois.Organization;
                    }catch(e){}
                    for (var j in d.ip) {
                        d.ip[j] = numericIP2string(d.ip[j]);
                    }
                }
                results.results[d.domain] = obj;
            }
            cont(null, results);
        });
}

function getDomainDetail(domain, options, cont){
    db.collection('domains').findOne({domain: domain}, function(err, data){
        if (err) {
            console.log(err);
            cont(err);
            return;
        }
        if (!data) {
            cont("Not Found");
            return;
        }
        data.info = data.whois;
        delete data.whois;
        delete data._id;
        if (data.ip) {
            getBriefFromList("ip", data.ip, {start: 0, count: data.ip.length},
                function(err, ipbrief){
                if (err){
                    cont(err);
                    return;
                }
                data.ip = {
                    start: 0,
                    count: data.ip.length,
                    results: ipbrief,
                    hasMore: false
                }
                cont(null, data);
            });
        } else {
            cont(null, data);
        }
    });
}

function getEmailOrRegistrantDetail(cond1, cond2, cond3, options, cont){
    var retval = {};
    var pending = 3;

    db.collection('domains').findOne(cond1, function(err,data){
        if (err) { console.log(err); cont(err); return; }
        if (data)
            retval.info = data.registrant;
        if (--pending == 0)
           cont(null, retval);
    });

    db.collection('subnets').find(cond2).toArray(function(err,data){
        if (err) { console.log(err); cont(err); return; }
        retval.ipranges = [];
        for (var i in data){
            retval.ipranges.push({
                beginIP: numericIP2string(data[i].beginIP),
                endIP: numericIP2string(data[i].endIP),
                CIDR: ipRange2CIDR(data[i].beginIP, data[i].endIP),
                regdate: data[i].regdate,
                address: data[i].whois.Address,
                country: data[i].country,
                organization: data[i].whois.Organization,
            });
        }
        if (--pending == 0)
            cont(null, retval);
    });

    getDomainBrief(cond3, options, function(err, data){
        if (err) { console.log(err); cont(err); return; }
        retval.domains = data;
        if (--pending == 0)
            cont(null, retval);
    });
}

function getEmailDetail(email, options, cont){
    getEmailOrRegistrantDetail(
        {"registrant.Email": email},
        {"whois.Email": email},
        {"registrant.Email": email},
        options, cont);
}

function getRegistrantDetail(registrant, options, cont){
    var domainCond = {$or:
        [ {"registrant.Name": registrant},
          {"registrant.Organization": registrant} 
        ]};
    getEmailOrRegistrantDetail(
        domainCond,
        {"whois.Organization": registrant},
        domainCond,
        options, cont);
}

var getEmailBrief = getBriefFactory("email");
var getRegistrantBrief = getBriefFactory("registrant");


function getDetail(matchField, matchValue, query, cont){
    var funcs = {
        ip: getIPDetail,
        domain: getDomainDetail,
        email: getEmailDetail,
        registrant: getRegistrantDetail,
    };
    if (!funcs[matchField]) {
        cont(400);
        return;
    }
    funcs[matchField](matchValue, query, cont);
}

function getBrief(getField, match, query, cont){
    var funcs = {
        ip: getIPBrief,
        domain: getDomainBrief,
        email: getEmailBrief,
        registrant: getRegistrantBrief,
    };
    if (!funcs[getField]) {
        cont(400);
        return;
    }
    funcs[getField](match, query, cont);
}

function wildcardQuery(matchField, matchValue, limitNum, cont){
    if (matchField != "domain"){
        cont("Only domain wildcard is supported");
        return;
    }

    matchValue = matchValue.toUpperCase(); // domains are stored in upper case
    if (!matchValue.match(/^[A-Z0-9.*?-]+$/)) {
        cont("Invalid char in wildcard domain query");
        return;
    }
    if (!matchValue.match(/[^*?]{4}/)) {
        cont("Your query is too broad. Please include at least 4 consecutive non-wildcard chars.");
        return;
    }

    wildcard.search(matchValue, 0, limitNum, function(err,data){
        if (err) {cont(err); return;}
        for (var i in data){
            data[i] = data[i].toLowerCase();
        }
        cont(null, data);
    });
}

// domains are in upper case in wildcard database
// but results should be in lower case
function wildcardQueryPostgres(matchField, matchValue, limitNum, cont){
    var query;

    var domainTLD = '';
    if (matchField == "domain") {
        query = "SELECT domain, tld FROM domains WHERE domain LIKE ";
        matchValue = matchValue.toUpperCase(); // domains are stored in upper case
        if (!matchValue.match(/^[A-Z*?]+(\.([A-Z]+|\*))?$/)) {
            cont("Invalid char in wildcard domain query");
            return;
        }
        if (matchValue.indexOf('.') != -1) {
            var splits = matchValue.split('.');
            if (splits[1] != '*')
                domainTLD = splits[1];
            matchValue = splits[0]; // search the domain excluding TLD part
        }
    }
    else if (matchField == "email") {
        query = "SELECT email FROM emails WHERE email LIKE ";
        if (!matchValue.match(/^[a-zA-Z0-9@.+*?_-]+$/)) {
            cont("Invalid char in wildcard email query");
            return;
        }
    }
    else {
        console.log("Unexpected matchField " + matchField + " in wildcardQuery");
        cont(500);
        return;
    }

    if (!matchValue.match(/[^*?]{3}/)) {
        cont("Your query is too board. Please include at least 3 consecutive non-wildcard chars.");
        return;
    }
    if (matchValue.split('*').length > 4) {
        cont("Your query has too many wildcard characters. Currently we support at most 3 wildcards.");
        return;
    }
    
    var likeExp = matchValue.replace(/%/g,  '\\%'). // escape '%'
                             replace(/_/g,  '\\_'). // escape '_'
                             replace(/\*/g, '%').
                             replace(/\?/g, '_');
    query += "'" + likeExp + "'";

    if (matchField == "domain" && domainTLD) {
        query += " AND tld = '" + domainTLD + "'";
    }

    query += " LIMIT " + limitNum;

    dbWildcard.query(query, function(err, result){
        if (err){
            console.log(err);
            cont(err);
            return;
        }
        var array = [];
        if (matchField == "domain") {
            for (i in result.rows) {
                array.push((result.rows[i].domain + '.' + result.rows[i].tld).toLowerCase().trim());
            }
        } else {
            for (i in result.rows)
                for (j in result.rows[i])
                    array.push(result.rows[i][j].trim());
        }
        cont(null, array);
    });
}

exports.genericQuery = function(query, cont) {
    var matchField;
    var matchValue;
    for (matchField in query.match) { // the object has only one property
        matchValue = query.match[matchField];
    }
    var limitNum = query.start + query.count + 1; // plus one for "hasMore" indicator
    if (query.listing == "no") {
        getDetail(matchField, matchValue, query, cont);
    }
    else { // "like" or range query
        if (typeof matchValue == "object" && matchValue["$like"]) {
            wildcardQuery(matchField, matchValue["$like"], limitNum, function(err, array){
                if (err) {
                    cont(err);
                    return;
                }
                if (array.length == 0) {
                    cont("No Results");
                    return;
                }
                var cond = matchCondMap(matchField, {$in: array});
                var added = matchCondMap(query.listing, {$ne: null}); // target field should not be null
                for (key in added)
                    if (!cond[key])
                        cond[key] = added[key];
                getBrief(query.listing, cond, query, cont);
            });
        }
        else {
            var cond = matchCondMap(matchField, matchValue);
            var added = matchCondMap(query.listing, {$ne: null}); // target field should not be null
            for (key in added)
                if (!cond[key])
                    cond[key] = added[key];
            getBrief(query.listing, cond, query, cont);
        }
    }
}

exports.getGeoLocation = function(numericIP) {
    return geoip.getLocationSync(numericIP);
}
