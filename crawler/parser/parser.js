var regex = require('../config').regex;

exports.registrant = function(domain, text) {
    var fields = {
        "": "Name",
        Name: "Name",
        Organization: "Organization",
        Org: "Organization",
        Street: "Street",
        Address: "Address",
        City: "City",
        "State/Province": "State/Province",
        "Province/State": "Province/State",
        State: "State",
        Province: "Province",
        "Postal Code": "Postal Code",
        Country: "Country",
        "Country Code": "Country",
        Phone: "Phone",
        Tel: "Phone",
        Fax: "Fax",
        Email: "Email",
    };

    var data = {};
    function extractField(line, separator){
        var idx = line.indexOf(separator);
        if (idx > 0){
            var option = lines[i].substr(0,idx).trim();
            if (!option)
                return false;
            if (option.indexOf("Registrant") == 0)
                option = option.substr(10).trim();
            if (fields[option]) {
                if (separator == '.')
                    while(line[++idx] == '.');
                data[fields[option]] = lines[i].substr(idx+1).trim();
                return true;
            }
        }
        return false;
    }

    var lines = text.split("\n");
try {
    for (var i in lines) {
        if (!extractField(lines[i], ':'))
            extractField(lines[i], '.');
    }

    if (!data.Email || !data.Email.match(regex.email)){
        var capture = text.match(regex.email);
        data['Email'] = capture ? capture[0].trim() : '';
    }
} catch(e) {
    console.log(e);
}
    return data;
}

function isSpace(c){
    return (c == '\n' || c == '\r' || c == ' ' || c == '\t');
}
function matchDomainInStr(domain, str){
    var lowerStr = str.toLowerCase();
    domain = domain.toLowerCase();
    while (true){
        var idx = lowerStr.indexOf(domain);
        if (idx == -1)
            return null;
        if (isSpace(lowerStr[idx + domain.length]))
            return str.substr(idx + domain.length).trim();
        else
            lowerStr = lowerStr.substr(idx + domain.length);
    }
}

exports.whois = function(domain, text) {
    if (domain.substr(-4) == ".org") {
        var fields = {
            'Created On': "createTime",
            'Last Updated On': "updateTime",
            'Expiration Date': "expireTime",
            'Sponsoring Registrar': "registrar",
        }
    }
    else { // .com, .net, .info
        var fields = {
            'Creation Date': "createTime",
            'Updated Date': "updateTime",
            'Expiration Date': "expireTime",
            'Whois Server': "whoisServer",
            'Registrar': "registrar",
        }
    }

    var data = {};
try {
    var lines = text.split('\n');
    for (var i in lines){
        var idx = lines[i].indexOf(':');
        if (idx == -1)
            continue;
        var option = lines[i].substr(0,idx).trim();
        if (fields[option]) {
            var key = fields[option];
            data[key] = lines[i].substr(idx+1).trim();
            if (key.indexOf('Time') >= 0){ // convert to date object, assume UTC
                data[key] = new Date(data[key] + " UTC");
                if (data[key] == "Invalid Date")
                    delete data[key];
            }
        }
    }
} catch(e) {
    console.log(e);
}
    return data;
}

