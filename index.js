const childProcess = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const Async = require('async');
const RandomColor = require('randomcolor');
const Rimraf = require('rimraf');
const Saytime = require('saytime');
const SixtySixty = require('sixty-sixty');
const Vtt2srt = require('vtt-to-srt');
const Wrap = require('wordwrap');
const LineWrap = Wrap(60);

const log = console;
const ss = SixtySixty();
const ssHrs = SixtySixty({ showHours: true });


module.exports = function(options, done) {
  const finalVidPath = options.out || 'out.mp4';
  const text = options.in;

  let tempDir;

  Async.waterfall([
    createTempDir,
    renderAudio,
    renderFrames,
    renderVtt,
    renderSrt,
    renderVideoParts,
    makePlaylist,
    assembleVideoParts,
    muxAudio,
    processResult,
    cleanTempDir
  ], done);

  function renderAudio(audioDone) {
    Saytime(text, { out: path.join(tempDir, 'out.wav') }, audioDone);
  }

  function renderVtt(state, vttDone) {
    const vttPath = path.join(tempDir, 'subtitles.vtt');
    const vttStream = fs.createWriteStream(vttPath);
    Async.eachOfSeries(state.parts, (part, idx, cb) => {
      const from = ssHrs(part.timestamp);
      const to = ssHrs(part.timestamp + part.duration);
      // Add the title number as an identifier. This also allows the vtt2srt to work
      // as it assumes numeric identifiers
      vttStream.write(`${idx + 1}\n${from} --> ${to}\n${part.wrappedText}\n\n`, 'UTF-8', cb);
    }, error => {
      if (error) {
        return vttDone(error);
      }
      return vttDone(null, Object.assign(state, { vttPath } ));
    });
  }

  function renderSrt(state, srtDone) {
    const srtPath = path.join(tempDir, 'subtitles.srt');
    Object.assign(state, { srtPath });
    const stream = fs.createReadStream(state.vttPath).pipe(Vtt2srt()).pipe(fs.createWriteStream(srtPath));
    stream.on('error', err => srtDone(err));
    stream.on('finish', () => srtDone(null, state));
  }

  function renderFrames(state, framesDone) {
    Async.mapValuesLimit(state.parts, 20, renderFrame, (err, framesObj) => {
      if (err) {
        return framesDone(err);
      }
      return framesDone(null, state);
    });
  }

  function renderFrame(part, id, frameDone) {
    const imgPath = path.join(tempDir, `${id}.png`);
    const wrappedText = LineWrap(part.sentence);
    const frameText = `${wrappedText}\n#${id} | ${ss(part.timestamp)}`;
    execFile('gm', [ 'convert', '-size', '640x360', `xc:${RandomColor()}`, '-fill', 'black', '-pointsize', '24', '-gravity', 'Center', '-draw',
        `text 0,0 "${frameText}"`, imgPath ], error => {
      if (error) {
        return frameDone(error);
      }
      return frameDone(null, Object.assign(part, { imgPath, wrappedText }), id);
    });
  }

  function renderVideoParts(state, partsDone) {
    Async.mapValuesLimit(state.parts, 6, renderVideoPart, (err, framesObj) => {
      if (err) {
        return partsDone(err);
      }
      return partsDone(null, state);
    });
  }

  function renderVideoPart(part, id, partDone) {
    const vidPath = path.join(tempDir, `${id}.mp4`);
    const clipLength = part.duration + (part.after || 0);
    execFile('ffmpeg', [ '-loop', 1, '-i', part.imgPath, '-c:v', 'libx264', '-t', clipLength, '-pix_fmt', 'yuv420p', vidPath ], vidError => {
      if (vidError) {
        return partDone(vidError);
      }
      return partDone(null, Object.assign(part, { vidPath }));
    });
  }

  function makePlaylist(state, plDone) {
    const listFilePath = path.join(tempDir, 'vidlist.txt');
    const listStream = fs.createWriteStream(listFilePath);
    Async.eachSeries(state.parts, (part, cb) => {
      listStream.write(`file '${part.vidPath}\n`, 'UTF-8', cb);
    }, (err, cb) => {
      if (err) {
        return plDone(err);
      }
      listStream.end();
      plDone(null, Object.assign(state, { listFilePath }));
    });
  }

  function assembleVideoParts(state, assembleDone) {
    const assembledVidPath = path.join(tempDir, 'assembled.mp4');
    execFile('ffmpeg', [ '-f', 'concat', '-i', state.listFilePath, '-c', 'copy', assembledVidPath ], (error, stdout, stderr) => {
      if (error) {
        return assembleDone(error);
      }
      return assembleDone(null, Object.assign(state, { assembledVidPath }));
    });
  }

  function muxAudio(state, muxDone) {
    const muxedVidPath = path.join(tempDir, 'muxed.mp4');
    execFile('ffmpeg', [ '-i', state.assembledVidPath, '-i', state.audioPath, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '48k', '-strict', 'experimental', muxedVidPath ], (error, stdout, stderr) => {
      if (error) {
        return muxDone(error);
      }
      return muxDone(null, Object.assign(state, { muxedVidPath }));
    });
  }

  function createTempDir(dirDone) {
    fs.mkdtemp(path.join(os.tmpdir(), 'gibberfish-'), (err, dir) => {
      tempDir = dir;
      dirDone(err);
    });
  }

  function cleanTempDir(result, cleanDone) {
    Rimraf(tempDir, err => cleanDone(err, result));
  }

  function processResult(state, cb) {
    const finalPathPrefix = path.join(path.dirname(finalVidPath), path.basename(finalVidPath, '.mp4'));
    Async.each([
        {from: state.muxedVidPath, to: finalVidPath},
        {from: state.vttPath, to: finalPathPrefix + '.vtt'},
        {from: state.srtPath, to: finalPathPrefix + '.srt'}],
      (pair, pairDone) => fs.rename(pair.from, pair.to, pairDone),
      err => cb(err, finalVidPath));
  }

  function execFile(file, args, cb) {
    log.info('RUNNING', file, args.join(' '));
    childProcess.execFile(file, args, cb);
  }
};
