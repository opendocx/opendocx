/*
This file is a slightly modified/updated version of xmlbuilder.js. It theoretically
supports output of aggregated data using either XML or JSON, although in this project
(opendocx) only XML is used. Another difference between this and xmlbuilder.js is that
this one looks for instances of IndirectVirtual and handles subsitutions for such instances
itself, whereas xmlbuilder.js required that those substitutinos happen upstream.
*/
const { IndirectVirtual } = require('yatte')
const isDate = require('date-fns/isDate')
const dateFormat = require('date-fns/format')

class DataAggregator {
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
      currentFrame._ident = ident // used for XML output and ignored for JSON
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
      throw new Error('Data aggregation error: Cannot push a list onto a list')
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
      throw new Error(`Data aggregation error: expected array frame, got ${typeof poppedFrame} instead`)
    }
    return poppedFrame
  }

  set (ident, value) {
    const currentFrame = this.peek()
    if (ident in currentFrame) {
      if ((currentFrame[ident] && currentFrame[ident].valueOf()) !== (value && value.valueOf())) {
        throw new Error('Data aggregation error: mutation?')
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

  toJson () {
    return JSON.stringify(this.data, (key, value) => {
      if (value instanceof IndirectVirtual) {
        const { scope, assembler, ...orig } = value
        if (assembler && !orig.data) {
          orig.data = assembler.data.data
        }
        return orig
      } // else
      return value
    })
  }

  toXml (elementName) {
    return '<?xml version="1.0"?>' + this.serializeXmlElement(elementName, this.data)
  }

  serializeXmlElement (ident, value) {
    if (value === '' || value === null || value === undefined /* || (Array.isArray(value) && value.length === 0) */) {
      return `<${ident}/>`
    } // else
    return `<${ident}>${this.serializeXmlValue(value)}</${ident}>`
  }

  serializeXmlValue (value) {
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
        return this.serializeXmlObject(value)
      case 'array': {
        const itemIdent = value._ident
        return value.map(item => this.serializeXmlElement(itemIdent, item)).join('')
      }
    }
  }

  serializeXmlObject (obj) {
    if (obj instanceof IndirectVirtual) {
      let uri = `oxpt://DocumentAssembler/insert/${obj.id}`
      if (obj.KeepSections) {
        uri += '?KeepSections=true'
      }
      return uri
    } // else
    var sb = []
    for (var key in obj) {
      sb.push(this.serializeXmlElement(key, obj[key]))
    }
    return sb.join('')
  }
}
module.exports = DataAggregator

const escapeXml = function (str) {
  str = str.valueOf()
  if (typeof str !== 'string') {
    console.log(`Unexpected: while aggregating, escapeXml called on a ${typeof str}!`)
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
