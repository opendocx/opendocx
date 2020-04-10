'use strict'

const isDate = require('date-fns/isDate')
const dateFormat = require('date-fns/format')

class XmlDataBuilder {
  constructor () {
    this.data = {}
    this.stack = [this.data]
  }

  empty () {
    return this.stack.length === 0
  }

  pushObject (ident) {
    const currentFrame = this.peek()
    let pushedObj
    if (Array.isArray(currentFrame)) {
      pushedObj = currentFrame[currentFrame.index]
      if (!pushedObj) {
        pushedObj = currentFrame[currentFrame.index] = {}
      }
    } else {
      pushedObj = currentFrame[ident]
      if (!pushedObj) {
        pushedObj = currentFrame[ident] = {}
      }
    }
    this.push(pushedObj)
  }

  popObject () {
    const poppedFrame = this.pop()
    const currentFrame = this.peek()
    if (Array.isArray(currentFrame)) {
      currentFrame.index = currentFrame.index + 1
    }
    return poppedFrame
  }

  pushList (ident) {
    const currentFrame = this.peek()
    let pushedArray
    if (Array.isArray(currentFrame)) {
      throw new Error('Error when generating XML: Cannot push a list onto a list')
    } else {
      pushedArray = currentFrame[ident]
      if (!pushedArray) {
        pushedArray = currentFrame[ident] = []
      }
      pushedArray.index = 0
    }
    this.push(pushedArray)
  }

  popList () {
    const poppedFrame = this.pop()
    if (!Array.isArray(poppedFrame)) {
      throw new Error(`Error when generating XML: expected array frame, got ${typeof poppedFrame} instead`)
    }
    return poppedFrame
  }

  set (ident, value) {
    const currentFrame = this.peek()
    if (ident in currentFrame) {
      if ((currentFrame[ident] && currentFrame[ident].valueOf()) !== (value && value.valueOf())) {
        throw new Error('Error while creating XML data file: data mutation?')
      }
    } else {
      currentFrame[ident] = value
    }
  }

  push (frame) {
    this.stack.push(frame)
  }

  pop () {
    return this.stack.pop()
  }

  peek () {
    return this.stack.length > 0 ? this.stack[this.stack.length - 1] : null
  }

  toString (joinstr = '') {
    return '<?xml version="1.0"?>' + this.serializeElement('_odx', this.data)
  }

  serializeElement (ident, value) {
    if (value === '' || value === null || value === undefined /* || (Array.isArray(value) && value.length === 0) */) {
      return `<${ident}/>`
    } // else
    return `<${ident}>${this.serializeValue(value, ident)}</${ident}>`
  }

  serializeValue (value, ident) {
    const valueType = Array.isArray(value.valueOf()) ? 'array' : isDate(value) ? 'date' : typeof value.valueOf()
    switch (valueType) {
      case 'string':
        return escapeXml(value)
      case 'date':
        return dateFormat(value, 'yyyy-MM-dd')
      case 'number':
        return value.toString()
      case 'boolean':
        return value ? 'true' : 'false'
      case 'object':
        return this.serializeObject(value)
      case 'array':
        return value.map(item => this.serializeElement(ident + '0', item)).join('')
    }
  }

  serializeObject (obj) {
    var sb = []
    for (var key in obj) {
      sb.push(this.serializeElement(key, obj[key]))
    }
    return sb.join('')
  }
}
module.exports = XmlDataBuilder

const escapeXml = function (str) {
  str = str.valueOf()
  if (typeof str !== 'string') {
    console.log(`Unexpected: while building XML, escapeXml called on a ${typeof str}!`)
    str = str.toString()
  }
  return str.replace(/[<>&'"]/g, function (c) {
    switch (c) {
      case '<': return '&lt;'
      case '>': return '&gt;'
      case '&': return '&amp;'
      case '\'': return '&apos;'
      case '"': return '&quot;'
    }
  })
}
