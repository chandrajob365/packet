var Variables = require('../variables')
var explode = require('../explode')
var qualify = require('../qualify')
var $ = require('programmatic')

function integer (field, assignee) {
    var read = [], bite = field.bite, stop = field.stop
    while (bite != stop) {
        read.unshift('buffer[start++]')
        if (bite) {
            read[0] += ' * 0x' + Math.pow(256, bite).toString(16)
        }
        bite += field.direction
    }
    read = read.reverse().join(' + \n')
    if (field.bytes == 1) {
        return assignee + ' = ' + read
    }
    return $('                                                              \n\
        ' + assignee + ' =                                                  \n\
            ', read, '')
}

function constructor (variables, definition, depth) {
    var fields = [], object = qualify('object', depth)
    variables.hoist(object)
    for (var name in definition) {
        if (name[0] === '$') {
            continue
        }
        var field = definition[name]
        if (Array.isArray(field)) {
            fields.push(name + ': new Array')
        } else {
            fields.push(name + ': null')
        }
    }
    return $('                                                              \n\
        ' + object + ' = {                                                  \n\
            ', fields.join(',\n'), '                                        \n\
        }                                                                   \n\
    ')
}

function nested (variables, definition, depth) {
    return $('                                                              \n\
        ', constructor(variables, definition, depth), '                     \n\
        ', parse(variables, definition, depth), '                           \n\
    ')
}

function lengthEncoded (variables, name, field, depth) {
    var source = ''
    var length = qualify('length', depth)
    var object = qualify('object', depth)
    var subObject = qualify('object', depth + 1)
    var i = qualify('i', depth)
    variables.hoist(i)
    variables.hoist(length)
    var looped = nested(variables, field, depth + 1)
    source = $('                                                            \n\
        ', integer(explode(field.$length), length), '                       \n\
        // __blank__                                                        \n\
        for (' + i + ' = 0; ' + i + ' < ' + length + '; ' + i + '++) {      \n\
            ', looped, '                                                    \n\
            // __blank__                                                    \n\
            ' + object + '.' + name + '.push(' + subObject + ')             \n\
        }                                                                   \n\
    ')
    return source
}

function parse (variables, definition, depth) {
    var source = ''
    for (var name in definition) {
        if (name[0] === '$') {
            continue
        }
        var field = definition[name]
        if (Array.isArray(field)) {
            field = field[0]
            if (field.$length) {
                source = $('                                                \n\
                    // __blank__                                            \n\
                    ', lengthEncoded(variables, name, field, depth), '      \n\
                ')
            }
        } else {
            var object = qualify('object', depth)
            field = explode(field)
            if (field.type === 'integer')  {
                source = $('                                                \n\
                    ', source, '                                            \n\
                    // __blank__                                            \n\
                    ', integer(field, object + '.' + name), '               \n\
                    // __reference__                                        \n\
                ')
            }
        }
    }
    return source
}

function parser (name, definition) {
    var variables = new Variables
    var source = $('                                                        \n\
        ', constructor(variables, definition, 0), '                         \n\
        ', parse(variables, definition, 0), '                               \n\
    ')
    return $('                                                              \n\
        parsers.' + name + ' = function () {                                \n\
        }                                                                   \n\
        // __blank__                                                        \n\
        parsers.' + name + '.prototype.parse = function (engine) {          \n\
            var buffer = engine.buffer                                      \n\
            var start = engine.start                                        \n\
            var end = engine.end                                            \n\
            // __blank__                                                    \n\
            ', String(variables), '                                         \n\
            // __blank__                                                    \n\
            ', source, '                                                    \n\
            // __blank__                                                    \n\
            engine.start = start                                            \n\
            // __blank__                                                    \n\
            return object                                                   \n\
        }                                                                   \n\
    ')
}

module.exports = function (compiler, definition) {
    var source = $('                                                        \n\
        var parsers = {}                                                    \n\
    ')
    Object.keys(definition).forEach(function (packet) {
        source = $('                                                        \n\
            ', source, '                                                    \n\
            // __blank__                                                    \n\
            ', parser(packet, definition[packet]), '                        \n\
        ')
    })
    source = $('                                                            \n\
        ', source, '                                                        \n\
        // __blank__                                                        \n\
        return parsers                                                      \n\
    ')
    return compiler(source)
}