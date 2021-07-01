var express = require('express');
var path = require('path');
var app = express();
const rendertron = require('rendertron-middleware');

const bots = [
  // crawler bots
  'googlebot',
  'bingbot',
  'yandexbot',
  'duckduckbot',
  'slurp',
  // link bots
  'twitterbot',
  'facebookexternalhit',
  'linkedinbot',
  'embedly',
  'baiduspider',
  'pinterest',
  'slackbot',
  'vkShare',
  'facebot',
  'outbrain',
  'W3C_Validator'
];

app.use('/post/:id', rendertron.makeMiddleware({
	proxyUrl: 'https://moviefy-redentron.an.r.appspot.com/render',
	userAgentPattern: new RegExp(bots.join('|'), 'i')
}));

app.use(express.static(path.join(__dirname, 'dist')));
app.use('*', express.static(path.join(__dirname, 'dist')));

module.exports = app;