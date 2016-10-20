Gibberfish
===

Generate test video content with Node.js. Useful for subtitle synchronisation testing. Gibberfish utilises the `say` command, GraphicsMagick and ffmpeg.

Content is generated by creating multiple concurrent segments before concatenating them so the generation time is significantly shorter than the output running time.

The output is a ~10 minute video with H.264 video, AAC audio and separate SRT and VTT subtitle files. The subtitles match the synchronized displayed text and spoken (TTS) audio tracks.

[Sample Output (YouTube)](https://www.youtube.com/watch?v=SiYVWiBm7k8)

# Requirements

Gibberfish requires:
* macOS with `say`
* Node 6+
* GraphicsMagick
* ffmpeg (providing the `ffmpeg` and `ffprobe` commands)

# Usage

```
node index.js [output.mp4]
```

- Generates `output.mp4`, `output.srt` and `output.vtt`
