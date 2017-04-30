
function log(x) {
    console.log(require('util').inspect(x, { depth: null }))
    return x
}

var { schema } = require('./schema.js')
var { compileToFunction } = require("./interpolator.js")

var source = require('fs').readFileSync('monad.schema').toString()

var testValue = schema.parse(source)

console.log("")
console.log("PARSE TREE:")
console.log("==========")
log(testValue.value)

var gen = compileToFunction(testValue.value, ["name", "capabilities"])

var name = "Reader"
var capabilities = ["ask", "local"]

console.log("")
console.log("GENERATED MODULE:")
console.log("================")
console.log(gen({name, capabilities}))
