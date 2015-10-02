
var fs = require('fs')


function sync (body) {
  var length = 0
  if (typeof body === 'string') {
    length = Buffer.byteLength(body)
  }
  else if (Array.isArray(body)) {
    length = body.reduce(function (a, b) {return a + b.length}, 0)
  }
  else if (Buffer.isBuffer(body)) {
    length = body.length
  }

  return length
}

function async (body, done) {
  // file stream
  if (body.hasOwnProperty('fd')) {
    fs.stat(body.path, function (err, stats) {
      if (err) return done(0)
      done(stats.size)
    })
  }
  // http response
  else if (body.hasOwnProperty('httpVersion')) {
    done(parseInt(body.headers['content-length']))
  }
  // request
  else if (body.hasOwnProperty('httpModule')) {
    body.on('response', function (res) {
      done(parseInt(res.headers['content-length']))
    })
  }
  // request-next
  else if (body.hasOwnProperty('_client')) {
    body.on('response', function (res) {
      done(parseInt(res.headers.get('content-length')) || 0)
    })
  }
  else {
    done(0)
  }
}

// request-multipart
function multipart (body, done) {
  var length = 0
  body._items.forEach(function (item) {
    length += sync(item)
  })
  if (!body._streams.length) return done(length)

  // should be parallel
  ;(function loop (index) {
    if (index === body._streams.length) {
      return done(length)
    }
    var stream = body._streams[index]
    if (stream._knownLength) {
      length += stream._knownLength
      loop(++index)
    }
    else {
      async(stream, function (len) {
        length += len
        loop(++index)
      })
    }
  }(0))
}

exports.sync = sync
exports.async = async
exports.multipart = multipart
