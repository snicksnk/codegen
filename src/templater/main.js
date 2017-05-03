
function log(x) {
  console.log(require('util').inspect(x, { depth: null }));
  return x;
}

const { schema } = require('./schema.js');
const { compileToFunction } = require('./interpolator.js');

const source = require('fs').readFileSync('monad.schema').toString();

const testValue = schema.parse(source);

console.log('');
console.log('PARSE TREE:');
console.log('==========');
log(testValue.value);

const gen = compileToFunction(testValue.value, ['name', 'capabilities']);

const name = 'Reader';
const capabilities = ['ask', 'local'];

console.log('');
console.log('GENERATED MODULE:');
console.log('================');
console.log(gen({ name, capabilities }));
