#!/usr/bin/env node

const fs = require('fs');

const gibberfish = require('..');

const argv = require('yargs')
  .usage('$0 [-f inputTextFile ] outputfile.mp4')
  .alias('f', 'file')
  .describe('f', 'Optionally load text from a file (- for STDIN)')
  .demand(1)
  .help('h')
  .argv;

const options = {
  out: argv._[0]
};

if (argv.f) {
  options.inputStream = argv.f === '-' ? process.stdin : fs.createReadStream(argv.f);
}

gibberfish(options, (err, result) => {
  if (err) {
    console.error(err);
    process.exit(-1);
  }
  console.info('DONE', result);
});
