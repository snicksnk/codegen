function defined(x) { return x !== undefined }

/*
    Holds information about where we are in the input string.
*/
class Position {
    static of(offset, line, col) {
        return new Position(offset, line || 1, col || 1)
    }

    constructor(offset, line, col) {
        this.offset = offset
        this.line   = line
        this.col    = col
    }

    /*
        Move n chars through the text. We have to do it char-by-char,
        because we want to track lines and columns.
    */
    advance(n, text) {
        var line = this.line
        var col  = this.col
        var i    = this.offset
        for (; i < this.offset + n; i++) {
            if (text[i] == '\n') {
                line++
                col = 1
            } else {
                col++
            }
        }
        return Position.of(i, line, col)
    }

    /*
        Test if current position is ahead of other one.
    */
    aheadOf(other) {
        return this.offset > other.offset
    }
}

/*
    Input stream for parser.
*/
class Stream {
    /*
        Make new stream of given text and position.
    */
    static of(text, pos) {
        return new Stream(text, pos || Position.of(0))
    }

    constructor(text, position) {
        this.text = text
        this.position = position
    }

    /*
        Check if current stream state is ahead of other one.
    */
    aheadOf(other) {
        return this.position.aheadOf(other.position)
    }

    /*
        Move position of current stream n chars ahead.
    */
    advance(n) {
        return Stream.of(this.text, this.position.advance(n, this.text))
    }

    end() {
        return this.text.length
    }

    location() {
        return this.position.offset
    }

    /*
        Cut off a piece of given size.

        Here and below: for simplicity, I will implicitly apply toString() to
        all streams in comments. Keep in mind that the source text is NOT sliced
        each time we advance.

        let pos    = Position.of(3)
        let stream = Stream.of("hello, world", pos)

        stream.take(5) === {value: "lo, w", stream: "orld"}
    */
    take(n) {
        if (this.location() + n <= this.end()) {
            return {
                value: this.text.substr(this.location(), n),
                stream: this.advance(n)
            }
        } else {
            return {
                error: "not eof",
                stream: this
            }
        }
    }

    toString() {
        return this.text.slice(this.location(), 50)
    }
}

class Parser {
    /*
        Wrap a parser function, allowing for usage of methods like many().

        (stream -> {value | error, stream}) -> Parser
    */
    constructor(runParser) {
        this.runParser = runParser
    }

    /*
        Parse a string of text.
    */
    parse(text) {
        return this.runParser(Stream.of(text))
    }

    /*
        Make parser that returns given "value" on any input
        (and doesn't consume any input).
    */
    static of(value) {
        return new Parser(stream => ({stream, value}))
    }

    /*
        Make parser that throws given "error" on any input
        (and doesn't consume any input).
    */
    static fail(error) {
        return new Parser(stream => ({stream, error}))
    }

    /*
        Like Promise#then.

        Run current parser, feed its result to "rest" callback (returning a parser),
        run the parser returned.

        Parser.then :: (this: Parser, (value) -> Parser) -> Parser
    */
    then(rest) {
        return new Parser(stream => {
            var res = this.runParser(stream)
            var p   = rest(res.value)

            assert(p instanceof Parser, "Promise#then: argument didn't return parser")

            return defined(res.value)
                ? p.runParser(res.stream)
                : res
        })
    }

    /*
        Run this parser, it it fails, run "other" parser.
    */
    or(other) {
        return new Parser(stream => {
            var res = this.runParser(stream)
            return defined(res.value) || res.stream.aheadOf(stream)
                ? res
                : other.runParser(stream)
        })
    }

    /*
        Succeed, it current parser fails; fail, if current parser succeeds.
    */
    not() {
        return new Parser(stream => {
            var res = this.runParser(stream)
            return defined(res.value)
                ? {error: "not", stream}
                : {value: true, stream}
        })
    }

    /*
        Check that other parser doesn't succeed, the run current one.
    */
    butNot(other) {
        return other.not()._and(this)
    }

    /*
        Run this parser, run other parser, return result of _current_ parser.

        Rule of thumb: when you see _ in the method name, that means the result
        of this side will be discarded.
    */
    and_(other) {
        return this.then(x => other.map(_ => x))
    }

    /*
        Run this parser, run other parser, return result of _other_ parser.
    */
    _and(other) {
        return this.then(_ => other)
    }

    /*
        Apply a pure function to result of current parser (if any).
    */
    map(f) {
        return this.then(x => Parser.of(f(x)))
    }

    /*
        Apply parser to the input until it fails. Return an array of results.
    */
    many() {
        return new Parser(stream => {
            var res, acc = []
            while (defined((res = this.runParser(stream)).value)) {
                if (!res.stream.aheadOf(stream)) {
                    throw new Error(
                        "Parser#many(p): p was not productive at "
                        + stream
                    )
                }
                acc.push(res.value)
                stream = res.stream
            }
            return {value: acc, stream}
        })
    }

    /*
        Call ".join(sep)" on the result of current parser.
        We're not in haskell, where "type String = List Char", so we need this.
    */
    join(sep) {
        return this.map(x => x.join(sep || ""))
    }

    /*
        P.string('a').sepBy(P.string('+')).parse("a+a+a+a-b")
        will produce
        {value: ['a', '+', 'a', '+', 'a', '+', 'a'], stream: '-b'}

        It keeps both elements (current parser results) and separators.
    */
    sepBy(sep) {
        var concat = (acc, d) => acc.concat(d)
        var pair = sep.then(x => this.map(y => [x, y]))
        return this.then(x => pair.many().map(xs => xs.reduce(concat, [x])))
    }

    /*
        P.string('a').sepBy_(P.string('+')).parse("a+a+a+a-b")
        will produce
        {value: ['a', 'a', 'a', 'a'], stream: '-b'}

        It keeps only elements (current parser results).
    */
    sepBy_(sep) {
        return this.then(x => sep._and(this).many().map(xs => [x].concat(xs)))
    }

    mark(label) {
        return this.map(x => ({[label]: x}))
    }

    /*
        Run current parser. If it fails, undo its input consumption.
        Allows to use Parser#or() on parsers that consumed input before failing.
    */
    try() {
        return new Parser(stream => {
            var res = this.runParser(stream)

            if (!defined(res.value)) {
                res.stream = stream
            }

            return res
        })
    }

    /*
        Fail on false, succeed on true.
    */
    guard(bool) {
        return bool? Parser.of(true) : Parser.fail("guard")
    }

    /*
        Premade parser. Will parse given "str" or fail consuming no input.

        P.string('hello').parse("hello, world")
            === {value: "hello", stream: ", world"}

        P.string('hello').parse("hell, world")
            === {error: "hello", stream: "hell, world"}
    */
    static string(str) {
        return new Parser(stream => {
            var res = stream.take(str.length)
            if (!defined(res.value)) {
                return res
            }

            if (str !== res.value) {
                return {
                    error: str,
                    stream
                }
            }

            return {value: str, stream: res.stream}
        })
    }

    /*
        Premade parser. Will parse any char, if there are remaining chars
        in input stream.
    */
    static anyChar() {
        return new Parser(stream => stream.take(1))
    }

    /*
        Allows parsers to depend recursively.

        Delays initialization of parser.

        It calls "thunk" (producing a parser) on first "runParser" invocation.
    */
    static later(thunk) {
        var cell = null
        return new Parser(stream => {
            cell = cell || thunk()
            return cell.runParser(stream)
        })
    }

    /*
        Return current position of the parser.
    */
    static position() {
        return new Parser(stream => ({value: stream.position, stream}))
    }
}

module.exports = { Parser }

