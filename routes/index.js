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
    var sections = {};
    result.forEach(function(data) {
      if (typeof sections[data.model] === 'undefined') {
        sections[data.model] = {
          model: data.model,
          ads: []
        }
      }

      sections[data.model].ads = sections[data.model].ads.concat(data.ads);
    });

    res.render('index', { sections: sections });
  });
});

function parseResponse(body) {
  var $ = cheerio.load(body);

  // parse title
  var model = $('title').text().split(',')[0].replace('SS.lv ', '');

  // parse list
  var list = [];
  $('#filter_frm table').eq(2).find('tr').each(function() {
    var row = $(this);

    var price = row.find('.msga2-o').last().text();
    var run = row.find('.msga2-r').text();
    if (!price
        || config.maxPrice && (isNaN(parseInt(price.replace(',', ''))) || parseInt(price.replace(',', '')) > config.maxPrice)
        || config.maxRun && parseInt(run) > config.maxRun) {

      return;
    }

    list.push({
      title: row.find('.msg2 a').text(),
      url: 'https://ss.lv' + row.find('.msg2 a').attr('href'),
      price: row.find('.msga2-o').last().text(),
      imageUrl: row.find('.msga2 img').attr('src'),
      year: row.find('.msga2-o').first().text(),
      engine: row.find('.msga2-o').eq(1).text(),
      run: run
    });
  });

  return {
    model: model,
    ads: list
  }
}

module.exports = router;
