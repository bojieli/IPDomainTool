
exports.isIP = function(str){
    var numbers = str.split('.');
    if (numbers.length != 4)
        return false;
    for (idx in numbers) {
        if (!numbers[idx].match(/^[0-9]+$/))
            return false;
        var n = Number(numbers[idx]);
        if (n >= 256 || n < 0)
            return false;
    }
    return true;
}

exports.isDomainName = function(str){
    var domains = str.split('.');
    if (domains.length < 2)
        return false;
    for (var i in domains){
        if (domains[i].match(/^[a-zA-Z0-9-]+$/) === null)
            return false;
    }
    return true;
}

exports.isIPRange = function(str){
    str = str.replace(/ /g, ''); // remove any space
    if (str.match(/^[0-9.*\/-]+$/) === null)
        return false;
    if (str.indexOf('/') >= 0) { // CIDR
        var splits = str.split('/');
        if (splits.length != 2)
            return false;
        var mask = parseInt(splits[1]);
        return exports.isIP(splits[0]) && mask > 0 && mask <= 32;
    }
    else if (str.indexOf('-') >= 0) { // start - end
        var splits = str.split('-');
        if (splits.length != 2)
            return false;
        return exports.isIP(splits[0]) && exports.isIP(splits[1]);
    } else { // wildcard *
        var splits = str.split('.');
        if (splits.length != 4)
            return false;
        var haveWildcard = false;
        for (idx in splits) {
            if (splits[idx] == '*') {
                haveWildcard = true;
            } else {
                if (haveWildcard) // 10.*.0.0 is disallowed
                    return false;
                if (!splits[idx].match(/^[0-9]+$/))
                    return false;
                var n = parseInt(splits[idx]);
                if (n >= 256 || n < 0)
                    return false;
            }
        }
        return haveWildcard;
    }
}

exports.isDomainWildcard = function(str){
    if (str.indexOf('*') < 0 && str.indexOf('?') < 0)
        return false;
    return str.match(/^[A-Za-z0-9*?.-]+$/);
}

exports.isEmail = function(str){
    var splits = str.split('@');
    if (splits.length != 2)
        return false;
    if (splits[0].match(/^[a-zA-Z0-9_.+-]+$/) === null)
        return false;
    if (!exports.isDomainName(splits[1]))
        return false;
    return true;
}

exports.isEmailWildcard = function(str){
    if (str.indexOf('*') == 0 && str.indexOf('?') == 0)
        return false;
    return exports.isEmail(str.replace(/\*/g, 'a').replace(/\?/g, 'a'));
}

