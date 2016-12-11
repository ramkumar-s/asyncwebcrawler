var request = require('request');
var cheerio = require('cheerio');
var csvWriter = require('csv-write-stream');
var fs = require('fs');

var domainurl = process.argv[2].toString();
var csvfile = process.argv[3];

/*  
    Object that holds all domain urls.
    Value of 1 represents that this url has not been accessed yet.
    Value of 0 represents that the url has been been accessed.
*/
var urlholder = {};
urlholder[domainurl] = 1;

var writer = csvWriter();
writer.pipe(fs.createWriteStream(csvfile));
/*
    Variable used to check whether all urls inside urholder have accessed.
*/
var flag;

/*
    Function used to execute callback on array elements while keeping current execution count to specified limit.
*/
function executeOnArray(limit) {
    return function (obj, taskfunction, callback) {
        if (limit <= 0 || !obj) {
            return callback(null);
        }
        var nextElem = returnIterator(obj);
        /*
            Flags used to check running callbacks
        */
        var done = false;
        var running = 0; 
        
        /*
            Function that calls specified callback and sets the flags
        */
        function taskCallback(err, value) {
            running -= 1;
            if (err) {
                done = true;
                callback(err);
            } else if (value === {} || done && running <= 0) {
                done = true;
                return callback(null);
            } else {
                refillExecQ();
            }
        }

        /*
            Function that checks if running callback limit is reached.
            If not reached, it calls given callback.
        */
        function refillExecQ() {
            while (running < limit && !done) {
                var elem = nextElem();
                if (elem === null) {
                    done = true;
                    if (running <= 0) {
                        callback(null);
                    }
                    return;
                }
                running += 1;
                taskfunction(elem.value, onlyOnce(taskCallback));
            }
        }

        refillExecQ();
    };
}

/*
    Function that converts array to iterator.
*/
function returnIterator(coll) {
    var i = -1;
    var len = coll.length;
    return function next() {
        return ++i < len ? { value: coll[i], key: i } : null;
    };
}

/*
    Function that ensures callback is called only once.
*/

function onlyOnce(func) {
    return function () {
        if (func === null) throw new Error("Callback was already called.");
        var taskFunc = func;
        func = null;
        taskFunc.apply(this, arguments);
    };
}

function crawl() {
    flag = 1;
    /*
        This array holds all unread urls.
    */
    var urllist = [];
    
    for (var key in urlholder) {
        if (urlholder[key]) {
            urllist.push(key);
            flag = 0;
        }
    }
    /*
        Iterating over urllist with async having set max number of operations to 5
    */
    executeOnArray(5)(
        urllist,
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