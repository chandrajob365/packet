module.exports = (function () {
    var parsers = {}

    parsers.object = function () {
    }

    parsers.object.prototype.parse = function (buffer, start) {

        var object

        object = {
            word: null
        }

        object.word = buffer[start++]

        return { start: start, object: object, parser: null }
    }

    return parsers
})()