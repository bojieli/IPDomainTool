
var geoip = require('geoip-lite');
var dataProvider = require('./data-mongodb');

exports.getLocationSync = function(ip){
    var data = geoip.lookup(ip);
    if (!data)
        return {};
    var ll = data.ll.toString().split(',');
    var range = data.range.toString().split(',');
    range[0] = dataProvider.numericIP2string(range[0]);
    range[1] = dataProvider.numericIP2string(range[1]);
    return {
        numericIP: ip,
        beginIP: range[0],
        endIP: range[1],
        country: data.country,
        region: data.region,
        city: data.city,
        latitude: ll[0],
        longitude: ll[1],
    };
}

exports.getASSync = function(ip){
    return {
        ASN: parseInt(Math.random() * 30000),
        Organization: "Example Organization"
    };
}
