'use strict'

class FieldExprNamer {
  constructor () {
    this.atomStore = {}
  }

  getFieldAtom (fieldObj) {
    const str = fieldObj.expr
    if (str === null) {
      throw new Error('Unexpected: cannot atomize a null string')
    }
    const existing = this.atomStore[str]
    if (typeof existing === 'string') return existing
    // else
    return (this.atomStore[str] = (fieldObj.type === 'List' ? 'L' : 'C') + fieldObj.id)
  }
}
module.exports = FieldExprNamer
