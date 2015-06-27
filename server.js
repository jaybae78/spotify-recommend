var https = require('https');
var http = require('http');
var events = require('events');
var querystring = require('querystring');
var static = require('node-static');

var getFromApi = function(endpoint, args) {
    var emitter = new events.EventEmitter();
    var options = {
        host: 'api.spotify.com',
        path: '/v1/' + endpoint + '?' + querystring.stringify(args)
    };
    var item = '';
    var searchReq = https.get(options, function(response) {
        response.on('data', function(chunk) {
            item += chunk;
        });
        response.on('end', function() {
            item = JSON.parse(item);
            emitter.emit('end', item);
        });
        response.on('error', function() {
            emitter.emit('error');
        });
    });
    return emitter;
};

var getRelatedArtists = function(arg) {
    var emitter = new events.EventEmitter();
    var options = {
        host: 'api.spotify.com',
        path: '/v1/artists/' + arg + '/related-artists'
    }

    var item = '';
    var req = https.get(options, function(response) {
        response.on('data', function(chunk) {
            item += chunk;
        });
        response.on('end', function() {
            item = JSON.parse(item);
            emitter.emit('end', item);
        });
        response.on('error', function() {
            emitter.emit('error');
        });
    });
    return emitter;
}

var fileServer = new static.Server('./public');
var server = http.createServer(function(req, res) {
    res.setHeader('Content-Type', 'application/json');
    if (req.method == "GET" && req.url.indexOf('/search/') == 0) {
        var name = req.url.split('/')[2];
        var searchReq = getFromApi('search', {
            q: name,
            limit: 1,
            type: 'artist'
        });

        searchReq.on('end', function(item) {
            var artist = item.artists.items[0];
            var relatedReq = getRelatedArtists(artist.id);
            relatedReq.on('end', function(item) {
                artist.related = item.artists
                res.end(JSON.stringify(artist));
            })
            relatedReq.on('error', function() {
                res.statusCode = 404;
                res.end()
            })
        });

        searchReq.on('error', function() {
            res.statusCode = 404;
            res.end();
        });
    }
    else {
        fileServer.serve(req, res);
    }
});

server.listen(8080);
