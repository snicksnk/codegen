
var P = require('./parser-combinators.js').Parser

var L_IN = P.string("{%")
var R_IN = P.string("%}")

var L_OUT = P.string("%{")
var R_OUT = P.string("}%")

var NL = P.string('\n')

var codeChar  = P.anyChar().butNot(L_OUT.or(R_IN).or(NL))
var textChar  = P.anyChar().butNot(L_IN.or(R_OUT).or(NL))

var codeWord  = codeChar.many().join()
var textWord  = textChar.many().join()

var codeBlock = P.later(_ => codeWord.sepBy(text).sepBy_(NL))
var textBlock = P.later(_ => textWord.sepBy(code).sepBy_(NL))

var code      = P.position().then(pos => L_IN ._and(codeBlock).and_(R_IN) .map(lines => ({pos, code: lines})))
var text      = P.position().then(pos => L_OUT._and(textBlock).and_(R_OUT).map(lines => ({pos, text: lines})))

var schema    = textBlock.mark("text")

module.exports = { schema }
