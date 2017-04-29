
function defined(x) { return x !== undefined }

class Position {
    static of(offset, line, col) {
        return new Position(offset, line, col)
    }

    constructor(offset, line, col) {
        this.offset = offset
        this.line   = line || 1
        this.col    = col  || 1
    }

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

    beyond(other) {
        return this.offset > other.offset
    }
}

class Stream {
    static of(text, pos) {
        return new Stream(text, pos || Position.of(0))
    }

    constructor(text, position) {
        this.text = text
        this.position = position
    }

    beyond(other) {
        return this.position.beyond(other.position)
    }

    advance(n) {
        return Stream.of(this.text, this.position.advance(n, this.text))
    }

    end() {
        return this.text.length
    }

    location() {
        return this.position.offset
    }

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
    constructor(runParser) {
        this.runParser = runParser
    }

    parse(text) {
        return this.runParser(Stream.of(text))
    }

    static of(value) {
        return new Parser(stream => ({stream, value}))
    }

    static fail(error) {
        return new Parser(stream => ({stream, error}))
    }

    then(rest) {
        return new Parser(stream => {
            var res = this.runParser(stream)
            return defined(res.value)
                ? rest(res.value).runParser(res.stream)
                : res
        })
    }

    or(other) {
        return new Parser(stream => {
            var res = this.runParser(stream)
            return defined(res.value) || res.stream.beyond(stream)
                ? res
                : other.runParser(stream)
        })
    }

    not() {
        return new Parser(stream => {
            var res = this.runParser(stream)
            return defined(res.value)
                ? {error: "not", stream}
                : {value: true, stream}
        })
    }

    butNot(other) {
        return other.not()._and(this)
    }

    and_(other) {
        return this.then(x => other.map(_ => x))
    }

    _and(other) {
        return this.then(_ => other)
    }

    map(f) {
        return this.then(x => Parser.of(f(x)))
    }

    many() {
        return new Parser(stream => {
            var res, acc = []
            while (defined((res = this.runParser(stream)).value)) {
                if (!res.stream.beyond(stream)) {
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

    join(sep) {
        return this.map(x => x.join(sep || ""))
    }

    sepBy(sep) {
        var concat = (acc, d) => acc.concat(d)
        var pair = sep.then(x => this.map(y => [x, y]))
        return this.then(x => pair.many().map(xs => xs.reduce(concat, [x])))
    }

    sepBy_(sep) {
        return this.then(x => sep._and(this).many().map(xs => [x].concat(xs)))
    }

    mark(label) {
        return this.map(x => ({[label]: x}))
    }

    try() {
        return new Parser(stream => {
            var res = this.runParser(stream)

            if (!defined(res.value)) {
                res.stream = stream
            }

            return res
        })
    }

    guard(bool) {
        return bool? Parser.of(true) : Parser.fail("guard")
    }

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

    static anyChar() {
        return new Parser(stream => stream.take(1))
    }

    static later(thunk) {
        var cell = null
        return new Parser(stream => {
            cell = cell || thunk()
            return cell.runParser(stream)
        })
    }

    static position() {
        return new Parser(stream => ({value: stream.position, stream}))
    }
}

module.exports = {Parser}
