#!/usr/bin/env node

const gibberfish = require('..');

const args = process.argv.slice(2);

const options = {};

if (args.length) {
  options.out = args[0];
}

gibberfish(options, (err, result) => {
  if (err) {
    console.error(err);
    process.exit(-1);
  }
  console.info('DONE', result);
});
