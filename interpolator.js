
var escape = require('js-string-escape')

function unindent(pos, line) {
    var i = 0;
    for (; i < pos; i++) {
        if (line[i] != ' ') {
            break
        }
    }
    return line.slice(i)
}

function unindentLine(amount) {
    return ([head, ...line]) =>
        [unindent(amount, head), ...line]
}

function eatOneBreak(tree) {
    var [head, ...lines] = tree

    if (head.length == 1 && head[0] == '')
        return [...lines]
    else
        return tree
}

function compileToFunction(tree, configKeys) {
    var keyDecls = configKeys
        .map(key => "var " + key + " = config." + key)
        .reduce((acc, x) => acc + x + '\n', '')

    function convertWord(word) {
        if (typeof word === "string") {
            return "'" + escape(word) + "'"
        } else {
            return recure(word)
        }
    }

    function convertCodeWord(word) {
        if (typeof word === "string") {
            return word
        } else {
            return recure(word)
        }
    }

    function recure(tree) {
        if (tree.text) {
            var newPos = tree.pos && tree.pos.col - 1 || 0
            var unindented = tree.text.map(unindentLine(newPos))
            var converted = unindented.map(line => line.map(convertWord).join(" + "))
            return converted.join(" + '\\n'\n + ")
        }

        if (tree.code) {
            var code   = tree.code
            var lines = code.map(line => line.map(convertCodeWord).join(""))
            return "toS(" + lines.join("") + ")"
        }

        return "WHAT"
    }

    var toStringDecl = "function toS(s) { return s instanceof Array? s.map(toS).join('') : s }\n"
    var text = toStringDecl + keyDecls + "\nreturn " + recure(tree)
    var fullText = "(config) => {\n" + text + "}"

    console.log("")
    console.log("GENERATOR FUNCTION:")
    console.log("==================")
    console.log(fullText + "\n")

    return eval(fullText)
}

module.exports = { compileToFunction }
