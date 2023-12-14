'use strict'

const { Scope, Engine, IndirectVirtual } = require('yatte')
const uuidv4 = require('uuid/v4')
const XmlDataBuilder = require('./xmlbuilder')
const loadTemplateModule = require('./load-template-module')

class XmlAssembler {
  constructor (scope) {
    this.indirects = []
    this.missing = {}
    this.errors = []
    this.contextStack = null
    if (scope) {
      this.contextStack = Scope.pushObject(scope, this.contextStack)
    }
    this.xmlStack = new XmlDataBuilder()
  }

  assembleXml (templateJsFile, joinstr = '') {
    try {
      const extractedLogic = loadTemplateModule(templateJsFile)
      extractedLogic.evaluate(this.contextStack, null, this)
      return this.xmlStack.toString(joinstr)
    } catch (e) {
      this.errors.push(e.message)
    }
  }

  beginObject (ident, objContext) {
    if (objContext !== this.contextStack && typeof objContext === 'number') { // top-level object
      this.contextStack = Scope.pushListItem(objContext, this.contextStack)
      this.xmlStack.pushObject(ident) // no need to push top-level object on XML stack
    }
  }

  endObject () {
    this.contextStack = Scope.pop(this.contextStack)
    this.xmlStack.popObject()
  }

  define (ident, expr) {
    if (Scope.empty(this.contextStack)) {
      throw new Error('internal error: Cannot define a member on an empty context stack')
    }
    const frame = this.contextStack
    if (frame.frameType === Scope.LIST) {
      throw new Error(`Evaluation error: cannot retrieve a member '${expr}' (${
        ident}) from a LIST; found a LIST when expecting a SINGLE object`)
      // error message & handling on this needs work, but it happens when a list context (which is expected to
      // represent an array of objects) actually contains an array OF ARRAYS of objects (nested instead of flat).
      // OpenDocx attempts to define/look up property 'ident' from an item in the outer list, and it fails
      // with this error because the item on which the lookup is being performed is, itself, another list.
    }

    const evaluator = Engine.compileExpr(expr) // these are cached so this should be fast
    let value = frame.evaluate(evaluator) // we need to make sure this is memoized to avoid unnecessary re-evaluation
    if (value === null || typeof value === 'undefined') {
      this.missing[expr] = true
      value = this.missingValuePlaceholder(expr, evaluator.ast)
    } else if (typeof value === 'object') {
      if (value instanceof IndirectVirtual) {
        value = this.indirectSub(value)
      } else if (value.errors || value.missing) {
        // value is a yatte EvaluationResult, probably because of nested template evaluation
        if (value.missing && value.missing.length > 0) {
          value.missing.forEach((expr) => { this.missing[expr] = true })
        }
        if (value.errors && value.errors.length > 0) {
          value.errors.forEach((errmsg) => { this.errors.push(errmsg) })
        }
        value = value.valueOf() // get the actual evaluated value
      }
    }
    if (value === '') {
      this.xmlStack.set(ident, undefined)
    } else if (typeof value === 'object') { // define should only be used to output simple scalar values into XML
      this.xmlStack.set(ident, value.toString()) // probably bad input; convert to a string representation
    } else {
      this.xmlStack.set(ident, value)
    }
  }

  indirectSub (indirect) {
    if (indirect.contentType !== 'text') { // docx, markdown, etc... substitute special placeholder
      // see if this indirect has already been encountered/added
      let existing = this.indirects.find(ex => Object.keys(indirect).every(propName => {
        const indPropVal = indirect[propName]
        return (indPropVal && (indPropVal instanceof Scope))
          ? indPropVal.valueEqualTo(ex[propName])
          : indirect[propName] === ex[propName]
      }))
      if (!existing) {
        existing = { ...indirect, id: uuidv4() }
        this.indirects.push(existing)
      }
      let uri = `oxpt://DocumentAssembler/insert/${existing.id}`
      if (indirect.KeepSections) {
        uri += '?KeepSections=true'
      }
      return uri
    }
    // else plain text... just evaluate it
    return indirect.toString()
  }

  beginCondition (ident, expr) {
    if (Scope.empty(this.contextStack)) {
      throw new Error('internal error: Cannot define a condition on an empty context stack')
    }
    const frame = this.contextStack
    if (frame.frameType !== Scope.OBJECT && frame.frameType !== Scope.PRIMITIVE) {
      throw new Error(`Internal error: cannot define a condition on a ${frame.frameType} context`)
    }
    const evaluator = Engine.compileExpr(expr) // these are cached so this should be fast
    const value = frame.evaluate(evaluator) // this ought to be memoized to avoid unnecessary re-evaluation
    const bValue = Scope.isTruthy(value)
    this.xmlStack.set(ident, bValue)
    return bValue
  }

  beginList (ident, expr) {
    const frame = this.contextStack
    const evaluator = Engine.compileExpr(expr) // these are cached so this should be fast
    const iterable = frame.evaluate(evaluator) // this ought to be memoized to avoid unnecessary re-evaluation
    this.contextStack = Scope.pushList(iterable || [], this.contextStack)
    const indices = this.contextStack.indices
    this.xmlStack.pushList(ident)
    return indices
  }

  endList () {
    this.xmlStack.popList()
    this.contextStack = Scope.pop(this.contextStack)
  }

  missingValuePlaceholder (expr, ast) {
    if (ast && ast.type === Engine.AST.AngularFilterExpression) {
      return this.missingValuePlaceholder(Engine.serializeAST(ast.input))
    }
    return '[' + expr + ']'
  }
}
module.exports = XmlAssembler
