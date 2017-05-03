
const P = require('./parser-combinators.js').Parser;

// each of these will match given token
const L_IN = P.string('{%');
const R_IN = P.string('%}');

const L_OUT = P.string('%{');
const R_OUT = P.string('}%');

const NL = P.string('\n');

// will match any char if text doesn't start from "%{", "%}" or "\n"
const codeChar = P.anyChar().butNot(L_OUT.or(R_IN).or(NL));

// will match any char if text doesn't start from "{%", "}%" or "\n"
const textChar = P.anyChar().butNot(L_IN.or(R_OUT).or(NL));

// will match continious chunk of codeChars and then join() them into string
const codeWord = codeChar.many().join();

// will match continious chunk of textChars and then join() them into string
const textWord = textChar.many().join();

// will match many codeWords, separated by occurences of "text", all separated by newlines
// will be initialized later
const codeBlock = P.later(_ => codeWord.sepBy(text).sepBy_(NL));

// will match many textWords, separated by occurences of "code", all separated by newlines
// will be initialized later
const textBlock = P.later(_ => textWord.sepBy(code).sepBy_(NL));

// will match {% "codeBlock" %} and store the position of {%
const code = P.position().then(pos => L_IN._and(codeBlock).and_(R_IN).map(lines => ({ pos, code: lines })));

// will match %{ "textBlock" }% and store the position of %{
const text = P.position().then(pos => L_OUT._and(textBlock).and_(R_OUT).map(lines => ({ pos, text: lines })));

// will match naked text with {% code %} inside
const schema = textBlock.mark('text');

module.exports = { schema };

