
var escape = require('js-string-escape')

var { schema } = require('./schema.js')

var testValue = schema.parse(require('fs').readFileSync('monad.schema').toString())



console.log(JSON.stringify(testValue.value))
