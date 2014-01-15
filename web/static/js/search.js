var start = 0;

var html = '';
function beginTable(id) {
    html += '<table ';
    if (id)
        html += 'id="' + id + '" ';
    html += 'class="table table-condensed">';
}
function beginSection(heading, id) {
    html += '<h3>' + heading + '</h3>';
    beginTable(id);
}
function endSection() {
    html += '</table>';
}
function addRow(name, value) {
    if (name && value)
        html += '<tr><th>' + name + '</th><td>' + value + '</td></tr>';
}
function genLink(href, text) {
    if (href && text)
        return '<a href="' + encodeURI(href) + '">' + text + '</a>';
    else
        return '';
}
function queryLink(query, text) {
    return genLink('./s?q=' + query, (text ? text : query));
}
function bingMapLink(latitude, longitude) {
    if (!latitude || !longitude)
        return '';
    link = 'http://bing.com/maps/default.aspx?q=' + latitude + '+' + longitude;
    latitude = latitude > 0 ? latitude.toString() + ' N' : (-latitude).toString() + ' S';
    longitude = longitude > 0 ? longitude.toString() + ' E' : (-longitude).toString() + ' W';
    return '<a href="' + link + '" target="_blank">' + latitude + ', ' + longitude + '</a>';
}

function registrantBriefList(registrants, noheader) {
    if (!registrants.count)
        return;
    if (noheader)
        beginTable('result-ip');
    else
        beginSection('Registrant', 'result-ip');
    for (var reg in registrants.results) {
        var d = registrants.results[reg];
        var text = '<p>' + queryLink(d.name) + ' '
            + (d.organization ? ', ' + queryLink(d.organization) + ' ' : '')
            + (d.email ? '(' + queryLink(d.email) + ') ' : '')
            + ((d.city && d.country) ? 'at ' + d.city + ', ' + d.country : '')
            + '</p>';
        var domains = [];
        for (var j in d.domains)
            domains.push(queryLink(d.domains[j]));
        text += '<p>Domains: ' + domains.join(', ')
            + (d.hasMoreDomains ? ' ' + queryLink(domains, "and more") : '')
            + '</p>';

        addRow(queryLink(reg), text);
    }
    endSection();
    if (registrants.hasMore)
        html += '<button id="show-more-registrant" type="button" class="btn btn-default btn-lg btn-block" onclick="ShowMoreRegistrant()">More registrants</button>';
}

function domainBriefList(domains, noheader) {
    if (!domains.count)
        return;
    if (noheader)
        beginTable('result-domain');
    else
        beginSection('Domains', 'result-domain');
    for (var domain in domains.results) {
        var d = domains.results[domain];
        var text = '';
        if (d.registrantName && d.registrantOrganization)
            text += queryLink(d.registrantName) + ', ' + queryLink(d.registrantOrganization);
        else
            text += queryLink(d.registrantName) + queryLink(d.registrantOrganization);
        text += (d.registrantEmail ? ' (' + queryLink(d.registrantEmail) + ') ' : '')
            + (d.registerTime ? ' on ' + d.registerTime.split('T')[0] : '');
        if (text)
            text = '<p>Registered by ' + text + '</p>';

        var ips = [];
        for (var j in d.ip)
            ips.push(queryLink(d.ip[j]));
        text += '<p>IP: ' + (ips.length ? ips.join(', ') : 'Not found') + '</p>';

        if (d.ipOrganization)
            text += '<p>Hosted by ' + queryLink(d.ipOrganization) + ' at ' + d.ipGeoCity + ', ' + d.ipGeoCountry + '</p>';

        addRow(queryLink(domain), text);
    }
    endSection();
    html += '<button id="show-more-domain" type="button" class="btn btn-default btn-lg btn-block" onclick="ShowMoreDomain()" style="display:block;">More domains</button>';
}

function IPBriefList(ips, noheader) {
    if (!ips.count)
        return;
    if (noheader)
        beginTable('result-ip');
    else
        beginSection('IP', 'result-ip');
    for (var ip in ips.results) {
        var d = ips.results[ip];
        var text = '<p>' + queryLink(d.organization) + ' '
            + (d.city ? d.city + ', ' : '') + d.country
            + ' ' + bingMapLink(d.latitude, d.longitude)
            + '</p>';
        var domains = [];
        for (var j in d.domains)
            domains.push(queryLink(d.domains[j]));
        text += '<p>Domains: ' + (domains.length ? domains.join(', ') : 'Not found')
            + (d.hasMoreDomains ? ' and ' + queryLink(ip, 'more') : '')
            + '</p>';

        addRow(queryLink(ip), text);
    }
    endSection();
    if (ips.hasMore)
        html += '<button id="show-more-ip" type="button" class="btn btn-default btn-lg btn-block" onclick="ShowMoreIP()">More IP</button>';
}

function showIP(data) {
    html = '';    
    if (data.registry) {
        var reg = data.registry;
        beginSection('Registration');
        if (reg.subnetBegin)
            addRow('IP Range', reg.subnetBegin + ' - ' + reg.subnetEnd);
        addRow('Registry', reg.registry);
        addRow('Registration Time', reg.regdate.split('T')[0]);
        endSection();
    }
    if (data.location) {
        var loc = data.location;
        beginSection('Location');
        addRow('Region', loc.region);
        addRow('Country', loc.country);
        addRow('city', loc.city);
        addRow('Geographic Coordinates', bingMapLink(loc.latitude, loc.longitude));
        endSection();
    }
    if (data.AS) {
        var AS = data.AS;
        beginSection('AS');
        addRow('ASN', AS.ASN);
        addRow('Organization', AS.organization);
        endSection();
    }
    if (data.whois) {
        var whois = data.whois;
        beginSection('IP Whois Information');
        addRow('Person', queryLink(whois.Person));
        addRow('Organization', queryLink(whois.Organization));
        addRow('Email', queryLink(whois.Email));
        addRow('Phone', whois.Phone);
        addRow('Fax', whois.Fax);
        addRow('Address', whois.Address);
        endSection();
    }
    if (data.domains) {
        domainBriefList(data.domains);
    }
    return html;
}

function showRegistrant(data) {
    html = '';
    if (data.info) {
        var info = data.info;
        beginSection('Registrant');
        addRow('Name', queryLink(info.Name));
        addRow('Organization', queryLink(info.Organization));
        addRow('Country', info.Country);
        addRow('State', info.State);
        addRow('City', info.City);
        addRow('Street', info.Street);
        addRow('Postal Code', info['Postal Code']);
        addRow('Phone', info.Phone);
        addRow('Email', queryLink(info.Email));
        endSection();
    }
    if (data.ipranges && data.ipranges.length) {
        beginSection('IP Ranges');
        html += '<tr><th>Begin IP</th><th>End IP</th><th>Description</th>';
        for (i in data.ipranges) {
            var range = data.ipranges[i];
            html += '<tr>'
                + '<td>' + range.beginIP + '</td><td>' + range.endIP + '</td>'
                + '<td>' + range.address + ' ' + range.country
                + ' (since ' + range.regdate.split('T')[0] + ')' + '</td>'
                + '</tr>';
        }
        endSection();
    }
    if (data.domains) {
        domainBriefList(data.domains);
    }
    return html;
}

function showDomain(data) {
    html = '';
    if (data.info) {
        var info = data.info;
        beginSection('Registration');
        addRow('Creation Time', info.createTime.split('T')[0]);
        addRow('Expiration Time', info.expireTime.split('T')[0]);
        addRow('Last Updated', info.updateTime.split('T')[0]);
        addRow('Registrar', queryLink(info.registrar));
        addRow('Whois Server', info.whoisServer);
        endSection();
    }
    if (data.registrant) {
        var reg = data.registrant;
        beginSection('Registrant');
        addRow('Name', queryLink(reg.Name));
        addRow('Organization', queryLink(reg.Organization));
        addRow('Country', reg.Country);
        addRow('City', reg.City);
        addRow('Street', reg.Street);
        addRow('Postal Code', reg['Postal Code']);
        addRow('Phone', reg.Phone);
        addRow('Email', queryLink(reg.Email));
        endSection();
    }
    if (data.nameserver) {
        beginSection('Name Server');
        for (var i in data.nameserver) {
            html += '<tr><td>' + data.nameserver[i] + '</td></tr>';
        }
        endSection();
    }
    if (data.ip) {
        IPBriefList(data.ip);
    }
    return html;
}

function showIPList(data, noheader)
{
    html = '';
    IPBriefList(data, noheader);
    return html;
}

function showDomainList(data, noheader) {
    html = '';
    domainBriefList(data, noheader);
    return html;
}

function showRegistrantList(data, noheader) {
    html = '';
    registrantBriefList(data, noheader);
    return html;
}

function GeoIP() {

}

var isListCacheValid = {};
$(document).ready(function () {
    $('#ipListLink').on('click', function () {
        if (!isListCacheValid.ip) {
            $('#ipList .panel-body').html('');
            getURL('ip');
        }
    });
    $('#domainListLink').on('click', function () {
        if (!isListCacheValid.domain) {
            $('#domainList .panel-body').html('');
            getURL('domain');
        }
    });
    $('#registrantListLink').on('click', function () {
        if (!isListCacheValid.registrant) {
            $('#registrantList .panel-body').html('');
            getURL('registrant');
        }
    });
    $('#emailListLink').on('click', function () {
        if (!isListCacheValid.email) {
            $('#emailList .panel-body').html('');
            getURL('email');
        }
    });
    $('#searchbtn').on('click', function () {
        var q = $('#mainquery').val().trim();
        if (q.length == 0) {
            location.href = "./index.html";
            return;
        }
        $('searchbtn').addClass('disabled');
        var u = '/s?' + 'q=' + encodeURIComponent(q);
        location.href = u;
    });
    $('#mainquery').keyup(function (e) {
        if (!$('#searchbtn').hasClass('disabled') && e.keyCode == 13) {
            $('#searchbtn').click();
        }
    });
    $(window).scroll(function () {
        if ($('#show-more-domain').css('display') == 'block') {
            if($(window).scrollTop() + $(window).height() >= $(document).height()){
                $('#show-more-domain').click();
            }
        }
    });
    getURL();
});

var lastSearch = null;
function getURL(listingType) {
    if (lastSearch != location.search) // clear cache if URL changed
        isListCacheValid = {};
    lastSearch = location.search;
    if (location.href.split('?')[1] == undefined) {
        return;
    }
    var q = location.pathname + location.search;
    if (!location.href || location.href.indexOf('?') == -1)
        return;
    var va = location.href.split('?')[1].split('&');
    for (var vk in va) {
        if (va[vk].split('=')[0] == 'q') {
            $('#mainquery').attr("value", decodeURIComponent(va[vk].split('=')[1]));
            break;
        }
    }
    
    $('#searchbtn').addClass('disabled');
    $('#searchbtn').html('<img src="./static/image/loader.gif" style="width:1em;height:auto;"/>');
    if (listingType) {
        q += '&listing=' + listingType;
        switch(listingType)
        {
            case 'ip': $('#ipList .panel-body').html('<div style="text-align:center"><img src="./static/image/loader.gif" /></div>'); break;
            case 'domain': $('#domainList .panel-body').html('<div style="text-align:center"><img src="./static/image/loader.gif" /></div>'); break;
            case 'email': $('#emailList .panel-body').html('<div style="text-align:center"><img src="./static/image/loader.gif" /></div>'); break;
            case 'registrant': $('#registrantList .panel-body').html('<div style="text-align:center"><img src="./static/image/loader.gif" /></div>'); break;
        }
    }
    else {
        $('#loader').css("display", "block");
    }
    $.ajax({
        method: 'post',
        url: q,
        dataType: 'json',
    }).done(function (data) {
        console.log(data);
        if (typeof data.ok == "undefined" || data.ok == 0 || typeof data.query !== "object") {
            $('#answerbox').html("<h2>Sorry</h2><p>" +
                (data.msg ? data.msg : "Unknown Server Error")
            + "</p>");
        }
        else {
            if (data.query.listing == "no") {
                $("#resultList").css("display", "none");
            }
            else {
                isListCacheValid[data.query.listing] = true;
                $("#resultList").css("display", "block");
            }
            if (data.data.length == 0) {
                $('#answerbox').html('<h2>No results</h2><p>No record found for query ' + q + '</p>');
            }
            else {
                var html = '';
                var qt = '';
                for (key in data.query.match) {
                    qt = key;
                }
                if (data.query.listing == 'no' && qt == 'domain') {
                    $('#PageRank').html('<h4>3rd Party Rankings</h4><a href="http://www.prchecker.net" title="PageRank Checker"><img src="http://www.prchecker.net/lookup.php?site=' + data.query.match.domain + '&badge=img3" /></a>' +
                        '<div class="third-party-ranking"><a href="http://www.prchecker.net/" title="Alexa">website rankings</a><iframe src="http://www.prchecker.net/checker/checker.php?site=' + data.query.match.domain + '&type=alexa"></iframe></div>' +
                        '<div class="third-party-ranking"><a href="http://www.prchecker.net/" title="Website Worth">website rankings</a><iframe src="http://www.prchecker.net/checker/checker.php?site=' + data.query.match.domain + '&type=websiteworth"></iframe></div>' +
                        '<div class="third-party-ranking"><a href="http://www.prchecker.net/" title="Page Authority">website rankings</a><iframe src="http://www.prchecker.net/checker/checker.php?site=' + data.query.match.domain + '&type=pageauthority"></iframe></div>' +
                        '<div class="third-party-ranking"><a href="http://www.prchecker.net/" title="SEOmoz">website rankings</a><iframe src="http://www.prchecker.net/checker/checker.php?site=' + data.query.match.domain + '&type=mozrank"></iframe></div>' +
                        '<div class="third-party-ranking"><a href="http://www.prchecker.net/" title="SEMrush">website rankings</a><iframe src="http://www.prchecker.net/checker/checker.php?site=' + data.query.match.domain + '&type=semrush"></iframe></div>');
                    $('#domainWhois').html('<a href="/whois/domain/' + data.query.match.domain + '">Full whois information</a>');
                    $('#safebrowsing').html('<a href="http://www.google.com/safebrowsing/diagnostic?site=' + data.query.match.domain + '" target="_blank">Google Safe Browsing Diagnostic for ' + data.query.match.domain + '</a>');
                    $('#bingbox').attr("value", data.query.match.domain);
                }
                if (data.query.listing == 'no' && qt == 'ip') {
                    $('#bingbox').attr("value", data.query.match.ip);
                }
                if (data.query.listing == 'no' && qt == 'email') {
                    $('#bingbox').attr("value", data.query.match.email);
                }
                if (data.query.listing == 'no' && qt == 'registrant') {
                    $('#bingbox').attr("value", data.query.match.registrant);
                }
                switch (data.query.listing) {
                    case 'ip':
                        $('#ipList .panel-body').html(showIPList(data.data, true));
                        $('#ipList').addClass('in active');
                        $('#ipListLink').addClass('active');
                        break;
                    case 'domain':
                        $('#domainList .panel-body').html(showDomainList(data.data, true));
                        $('#domainList').addClass('in active');
                        $('#domainListLink').addClass('active');
                        break;
                    case 'email':
                        $('#emailList .panel-body').html(showRegistrantList(data.data, true));
                        $('#emailList').addClass('in active');
                        $('#emailListLink').addClass('active');
                        break;
                    case 'registrant':
                        $('#registrantList .panel-body').html(showRegistrantList(data.data, true));
                        $('#registrantList').addClass('in active');
                        $('#registrantListLink').addClass('active');
                        break;
                    case 'no':
                        switch (qt) {
                            case 'ip': html += '<h2>IP Information for ' + data.query.match.ip + '</h2><div>' + showIP(data.data) + '</div>'; break;
                            case 'email': html += '<h2>Registrant Information for ' + data.query.match.email + '</h2><div>' + showRegistrant(data.data) + '</div>'; break;
                            case 'registrant': html += '<h2>Registrant Information for ' + data.query.match.registrant + '</h2><div>' + showRegistrant(data.data) + '</div>'; break;
                            case 'domain': html += '<h2>Domain Information for ' + data.query.match.domain + '</h2><div>' + showDomain(data.data) + '</div>'; break;
                            default: html += '<h2>Sorry, the server cannot understand your query</h2>'; break;
                        }
                        $('#answerbox').html(html);
                        break;
                }
            }
        }
    }).fail(function () {
        $('#answerbox').html('<h2>Failed to connect to server</h2>');
    }).always(function () {
        $('#answerbox').show();
        $('#searchbtn').removeClass('disabled');
        $('#searchbtn').html('<span class="glyphicon glyphicon-search"></span>');
        $('#loader').css("display", "none")
    });
}

function ShowMoreDomain()
{
    html = $('#result-domain').html();
    console.log(typeof html);
    start += 10;
    var q = location.pathname + location.search + '&listing=domain&start=' + start + '&count=10';
    $('#show-more-domain').addClass('disabled');
    $('#show-more-domain').html('<img src="./static/image/loader.gif" style="width:1em;height:auto;"/>');
    $.ajax({
        method: 'post',
        url: q,
        dataType: 'json',
    }).done(function (data) {
        console.log(data);
        if (typeof data.ok == "undefined" || data.ok == 0 || typeof data.query !== "object") {
            $('#answerbox').html("<h2>Sorry</h2><p>" +
                (data.msg ? data.msg : "Unknown Server Error")
            + "</p>");
        }
        else {
            if (data.data.length == 0) {
                $('#answerbox').html('<h2>No results</h2><p>No record found for query ' + q + '</p>');
            }
            else {
                var domains = data.data;
                if (!domains.count)
                    return;
                
                for (var domain in domains.results) {
                    var d = domains.results[domain];
                    var text = '';
                    if (d.registrantName && d.registrantOrganization)
                        text += queryLink(d.registrantName) + ', ' + queryLink(d.registrantOrganization);
                    else
                        text += queryLink(d.registrantName) + queryLink(d.registrantOrganization);
                    text += (d.registrantEmail ? ' (' + queryLink(d.registrantEmail) + ') ' : '')
                        + (d.registerTime ? ' on ' + d.registerTime.split('T')[0] : '');
                    if (text)
                        text = '<p>Registered by ' + text + '</p>';

                    var ips = [];
                    for (var j in d.ip)
                        ips.push(queryLink(d.ip[j]));
                    text += '<p>IP: ' + (ips.length ? ips.join(', ') : 'Not found') + '</p>';

                    if (d.ipOrganization)
                        text += '<p>Hosted by ' + queryLink(d.ipOrganization) + ' at ' + d.ipGeoCity + ', ' + d.ipGeoCountry + '</p>';

                    addRow(queryLink(domain), text);
                }
               
                if (domains.hasMore)
                    $('#show-more-domain').css("display", "block");
                else
                    $('#show-more-domain').css("display", "none");
                $('#result-domain').html(html);
            }
        }
    }).fail(function () {
        $('#answerbox').html('<h2>Failed to connect to server</h2>');
    }).always(function () {
        $('#searchbtn').removeClass('disabled');
        $('#show-more-domain').removeClass('disabled');
        $('#show-more-domain').html('More domains');
    });
}
function ShowMoreIP() {
    var html = $('#result-ip').html();
    start += 10;
    var q = location.pathname + location.search + '&listing=ip&start=' + start + '&count=10';
    $.ajax({
        method: 'post',
        url: q,
        dataType: 'json',
    }).done(function (data) {
        console.log(data);
        if (typeof data.ok == "undefined" || data.ok == 0 || typeof data.query !== "object") {
            $('#answerbox').html("<h2>Sorry</h2><p>" +
                (data.msg ? data.msg : "Unknown Server Error")
            + "</p>");
        }
        else {
            if (data.data.length == 0) {
                $('#answerbox').html('<h2>No results</h2><p>No record found for query ' + q + '</p>');
            }
            else {
                for (var i in data.results) {
                    var linkdomain = './s?q=' + i;
                    html += '<tr><th rowspan="8"><a href=' + linkdomain + '>' + i + '</a></th>';
                    html += '<td>Registration Time</td><td>' + data.results[i]['registerTime'].split('T')[0] + '</td></tr>';
                    var linkName = './s?q=' + data.results[i]['registrantName'];
                    html += '<tr><td>Registrant Name</td><td><a href=' + linkName + '>' + data.results[i]['registrantName'] + '</td></tr>';
                    var linkOrg = './s?q=' + data.results[i]['registrantOrganization'];
                    html += '<tr><td>Registrant Organization</td><td><a href=' + linkOrg + '>' + data.results[i]['registrantOrganization'] + '</td></tr>';
                    var linkEmail = './s?q=' + data.results[i]['registrantEmail'];
                    html += '<tr><td>Registrant Email</td><td><a href=' + linkEmail + '>' + data.results[i]['registrantEmail'] + '</a></td></tr>';

                    html += '<tr><td>IP</td><td>';
                    for (var j in data.results[i]['ip']) {
                        var linkIP = './s?q=' + data.results[i]['ip'][j];
                        html += '<a href=' + linkIP + '>' + data.results[i]['ip'][j] + '</a>, ';
                    }
                    html += '</td></tr>';

                    var linkIPOrg = './s?q=' + data.results[i]['ipOrganization'];
                    html += '<tr><td>IP Organization</td><td><a href=' + linkIPOrg + '>' + data.results[i]['ipOrganization'] + '</a></td></tr>';
                    html += '<tr><td>IP Country</td><td>' + data.results[i]['ipGeoCountry'] + '</td></tr>';
                    html += '<tr><td>IP City</td><td>' + data.results[i]['ipGeoCity'] + '</td></tr>';
                }
                $('#result-domain').html(html);
            }
        }
    }).fail(function () {
        $('#answerbox').html('<h2>Failed to connect to server</h2>');
    }).always(function () {
        $('#searchbtn').removeClass('disabled');
    });
}
$(function(){
    getURL();
});
