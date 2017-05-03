
const escape = require('js-string-escape');

function unindent(pos, line) {
  let i = 0;
  for (; i < pos; i++) {
    if (line[i] !== ' ') {
      break;
    }
  }
  return line.slice(i);
}

function unindentLine(amount) {
  return ([head, ...line]) =>
        [unindent(amount, head), ...line];
}

/*
function eatOneBreak(tree) {
  const [head, ...lines] = tree;

  if (head.length == 1 && head[0] == '') { return [...lines]; } else { return tree; }
}
*/

function compileToFunction(tree, configKeys) {
  const keyDecls = configKeys
        .map(key => `var ${key} = config.${key}`)
        .reduce((acc, x) => `${acc + x}\n`, '');

  function convertWord(word) {
    if (typeof word === 'string') {
      return `'${escape(word)}'`;
    } else {
      return recure(word);
    }
  }

  function convertCodeWord(word) {
    if (typeof word === 'string') {
      return word;
    } else {
      return recure(word);
    }
  }

  function recure(tree) {
    if (tree.text) {
      const newPos = (tree.pos && tree.pos.col) - 1 || 0;
      const unindented = tree.text.map(unindentLine(newPos));
      const converted = unindented.map(line => line.map(convertWord).join(' + '));
      return converted.join(" + '\\n'\n + ");
    }

    if (tree.code) {
      const code = tree.code;
      const lines = code.map(line => line.map(convertCodeWord).join(''));
      return `toS(${lines.join('')})`;
    }

    return 'WHAT';
  }

  const toStringDecl = "function toS(s) { return s instanceof Array? s.map(toS).join('') : s }\n";
  const text = `${toStringDecl + keyDecls}\nreturn ${recure(tree)}`;
  const fullText = `(config) => {\n${text}}`;

  console.log('');
  console.log('GENERATOR FUNCTION:');
  console.log('==================');
  console.log(`${fullText}\n`);

  return eval(fullText);
}

module.exports = { compileToFunction };

