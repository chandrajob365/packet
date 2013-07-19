var cadence = require('cadence')
var edify = require('edify')

module.exports = cadence(function (step, $, cache) {
    step(function () {
        edify.marked($, '.description', step())
    }, function () {
        edify.pygments($, '.lang-javascript', 'javascript', cache, step())
    })
})