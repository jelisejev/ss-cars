var express = require('express');
var https = require('follow-redirects').https;
var cheerio = require('cheerio');
var async = require('async');
var config = require('../config');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  var functions = [];
  config.urls.forEach(function(url) {
    functions.push(function(callback) {
      https.get(url, function(response) {
        var body = '';

        response.setEncoding('utf8');
        response.on('data', function (chunk) {
          body += chunk;
        });
        response.on('end', function() {
          var list = parseResponse(body);

          callback(null, list);
        });
      });
    });
  });

  async.parallel(functions, function(error, result) {
    var ads = [];
    result.forEach(function(list) {
      ads = ads.concat(list);
    });

    res.render('index', { ads: ads });
  });
});

function parseResponse(body) {
  var $ = cheerio.load(body);

  var list = [];
  $('#filter_frm table').eq(2).find('tr').each(function() {
    var row = $(this);

    var price = row.find('.msga2-o').last().text();
    if (!price || config.maxPrice && parseInt(price.replace(',', '')) > config.maxPrice) {
      return;
    }

    list.push({
      title: row.find('.msg2 a').text(),
      price: row.find('.msga2-o').last().text()
    });
  });

  return list;
}

module.exports = router;
