const fs = require('fs');
const childProcess = require('child_process');
const path = require('path');

const Async = require('async');
const RandomColor = require('randomcolor');
const Request = require('request');
const Saytime = require('saytime');
const StringEscape = require('js-string-escape');
const textGen = require('./lib/text-gen');

const log = console;
const text = textGen();

let tempDir;

Async.waterfall([
    createTempDir,
    renderAudio,
    renderFrames,
    renderVideoParts,
    makePlaylist,
    assembleVideoParts
], (err, result) => {
  if (err) {
    return log.error('ERROR', err);
  }
  log.info('RESULT', result);
});

function renderAudio(done) {
  Saytime(text, { out: path.join(tempDir, 'out.wav') }, done);
}

function renderFrames(state, done) {
  Async.mapValuesLimit(state.parts, 20, renderFrame, (err, framesObj) => {
    if (err) {
      return done(err);
    }
    return done(null, state);
  });
}

function renderFrame(part, id, done) {
  const imgPath = path.join(tempDir, `${id}.png`);
  const text = StringEscape(part.sentence.match(/(([^\W]+\W){1,6})/g).join('\n')) + `\n${id}:${part.timestamp}`;;
  childProcess.execFile('gm', [ 'convert', '-size', '640x360', `xc:${RandomColor()}`, '-fill', 'black', '-pointsize', '32', '-gravity', 'Center', '-draw',
      `text 0,0 "${text}"`, imgPath ], error => {
    if (error) {
      return done(error);
    }
    return done(null, Object.assign(part, { imgPath }), id);
  });
}

function renderVideoParts(state, done) {
  Async.mapValuesLimit(state.parts, 6, renderVideoPart, (err, framesObj) => {
    if (err) {
      return cb(err);
    }
    return done(null, state);
  });
}

function renderVideoPart(part, id, done) {
  const vidPath = path.join(tempDir, `${id}.mp4`);
  childProcess.execFile('ffmpeg', [ '-loop', 1, '-i', part.imgPath, '-c:v', 'libx264', '-t', part.duration, '-pix_fmt', 'yuv420p', vidPath ], vidError => {
    if (vidError) {
      return done(vidError);
    }
    return done(null, Object.assign(part, { vidPath }));
  });
}

function makePlaylist(state, done) {
  const listFilePath = path.join(tempDir, 'vidlist.txt');
  const listStream = fs.createWriteStream(listFilePath);
  Async.eachSeries(state.parts, (part, cb) => {
    listStream.write(`file '${part.vidPath}\n`, 'UTF-8', cb);
  }, (err, cb) => {
    if (err) {
      return done(err);
    }
    listStream.end();
    done(null, Object.assign(state, { listFilePath }));
  });
}

function assembleVideoParts(state, done) {
  const assembledVidPath = path.join(tempDir, 'assembled.mp4');
  childProcess.execFile('ffmpeg', [ '-f', 'concat', '-i', state.listFilePath, '-c', 'copy', assembledVidPath ], (error, stdout, stderr) => {
    if (error) {
      return done(error);
    }
    return done(null, Object.assign(state, { assembledVidPath }));
  });
}

function createTempDir(cb) {
  fs.mkdtemp('/tmp/gibberfish-', (err, dir) => {
    tempDir = dir;
    cb(err);
  });
}
