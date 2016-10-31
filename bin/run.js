#!/usr/bin/env node

const fs = require('fs');

const Async = require('async');
const ConcatStream = require('concat-stream');
const EndOfStream = require('end-of-stream');
const Gibberfish = require('..');

const textGen = require('../lib/text-gen');

const argv = require('yargs')
  .usage('$0 [-f inputTextFile ] outputfile.mp4')
  .alias('f', 'file')
  .string('f')

  .describe('f', 'Optionally load text from a file (- for STDIN)')
  .demand(1)
  .help('h')
  .argv;

const options = {
  out: argv._[0]
};

function getTextContent(done) {
  if (argv.f) {
    const inputStream = argv.f === '-' ? process.stdin : fs.createReadStream(argv.f);
    return EndOfStream(
      inputStream.pipe(ConcatStream(result => done(null, result.toString('utf-8')))),
      err => {
        if (err) {
          return done(err);
        }
      });
  }
  return setImmediate(() => done(null, textGen()));
}

Async.waterfall([
  getTextContent,
  (text, cb) => {
    Gibberfish(Object.assign(options, { 'in': text }), cb);
  }
], (err, result) => {
  if (err) {
    console.error('ERROR', err);
    process.exit(-1);
  }
  console.info('DONE', result);
});
