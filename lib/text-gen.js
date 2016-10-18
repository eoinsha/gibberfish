const RandomWords = require('random-words');

module.exports = function(options = {}) {
  const paragraphs = options.paragraphs || 10;
  const sentences = options.sentences || 10;
  const words = options.words || 15;

  return genText();

  function genText() {
    return new Array(paragraphs).fill(0).map(() => genParagraph()).join('\n\n');
  }

  function genParagraph() {
    return new Array(sentences).fill(0).map(() => genSentence()).join(' ');
  }

  function genSentence() {
    const chars = RandomWords(words).join(' ').split('');
    const rest = chars.splice(1);
    return [chars[0].toUpperCase(), ...rest, '.'].join('');
  }
};
