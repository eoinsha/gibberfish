const Request = require('request');

const textGen = require('./lib/text-gen');

const log = console;

const text = textGen();
processText(text);

function processText(text) {
  log(text);
}
