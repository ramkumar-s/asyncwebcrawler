var request = require('request');
var cheerio = require('cheerio');
var csvWriter = require('csv-write-stream');
var fs = require('fs');
var async = require('async');

var domainurl = process.argv[2].toString();
var csvfile = process.argv[3];
var urlholder = {};
urlholder[domainurl] = 1;
/*  
    Object that holds all domain urls.
    Value of 1 represents that this url has not been accessed yet.
    Value of 0 represents that the url has been been accessed.
*/
var writer = csvWriter();
writer.pipe(fs.createWriteStream(csvfile));
var flag;
/*
    Variable used to check whether all urls inside urholder have accessed.
*/

function crawl() {
    flag = 1;
    var urllist = [];
    /*
        This array holds all unread urls.
    */
    for (var key in urlholder) {
        if (urlholder[key]) {
            urllist.push(key);
            flag = 0;
        }
    }
    /*
        Iterating over urllist with async having set max number of operations to 5
    */
    async.forEachLimit(
        urllist,
        5,
        function (url, callback) {
            urlholder[url] = 0;
            /*
                Reading url with request library
            */
            request(url, function (err, resp, body) {
                if (err) {
                    return callback(err);
                }
                try {
                    /*
                        Using cheerio library to access all hyperlinks inside the page.
                        Writing all hyperlinks to csv file.
                        Adding hyperlinks in same domain to urlholder.
                    */
                    $ = cheerio.load(body);
                    links = $('a');
                    $(links).each(function (i, link) {
                        writer.write({ heading: $(link).text(), url: $(link).attr('href') });
                        if ($(link).attr('href').indexOf(domainurl) >= 0) {
                            urlholder[$(link).attr('href')] = 1;
                        }
                    });
                }
                catch (e) {
                    console.log(e);
                    return callback(e);
                }
                callback();
            });
        },
        function (err) {
            if (err) {
                console.log(err);
            }
            /*
                Flag being 0 means all urls in urlholder have been read and script will exit,
                Else well call crawl() again to read the newly added urls in same domain.
            */
            if (flag) {
                writer.end();
                return 0;
            }
            else {
                crawl();
            }
        }
    );
}
crawl();