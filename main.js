
function log(x) {
    console.log(require('util').inspect(x, { depth: null }))
    return x
}

var { schema } = require('./schema.js')
var { compileToFunction } = require("./interpolator.js")

var source = require('fs').readFileSync('monad.schema').toString()

var testValue = schema.parse(source)

log(testValue.value)

var gen = compileToFunction(testValue.value, ["name", "capabilities"])

var name = "Reader"
var capabilities = ["ask", "local"]

process.stdout.write(gen({name, capabilities}))
