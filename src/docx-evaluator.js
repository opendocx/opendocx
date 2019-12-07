'use strict'

const { Scope, Engine } = require('yatte')
const XmlDataBuilder = require('./xmlbuilder')
const version = require('./version')
const semver = require('semver')

class XmlAssembler {
  constructor (context, locals = null) {
    this.missing = {}
    this.contextStack = null
    if (context) {
      this.contextStack = Scope.pushObject(context, this.contextStack)
    }
    if (locals) {
      this.contextStack = Scope.pushObject(locals, this.contextStack)
    }
    this.xmlStack = new XmlDataBuilder()
  }

  loadTemplateModule (templateJsFile) {
    const thisVers = semver.major(version) + '.' + semver.minor(version)
    const extractedLogic = require(templateJsFile)
    const loadedVers = extractedLogic.version
    if (loadedVers && (semver.eq(version, loadedVers) || semver.satisfies(loadedVers, thisVers))) {
      return extractedLogic
    } // else
    // invalidate loaded module with incorrect version!
    delete require.cache[require.resolve(templateJsFile)]
    throw new Error(`Version mismatch: Expecting template JavaScript version ${thisVers}.x, but JS file is version ${loadedVers}`)
  }

  assembleXml (templateJsFile, joinstr = '') {
    const extractedLogic = this.loadTemplateModule(templateJsFile)
    extractedLogic.evaluate(this.contextStack, null, this)
    return this.xmlStack.toString(joinstr)
  }

  beginObject (ident, objContext, objLocals) {
    if (objContext !== this.contextStack && typeof objContext === 'number') {
      this.contextStack = Scope.pushListItem(objContext, this.contextStack)
      this.xmlStack.pushObject(ident)
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
    if (frame._objType !== Scope.OBJECT && frame._objType !== Scope.PRIMITIVE) {
      throw new Error(`Internal error: cannot define a member on a ${frame._objType} context`)
    }

    const evaluator = Engine.compileExpr(expr) // these are cached so this should be fast
    let value = frame._evaluate(evaluator) // we need to make sure this is memoized to avoid unnecessary re-evaluation
    if (value && (typeof value === 'object') && (value.errors || value.missing)) { // value is a yatte EvaluationResult, probably because of nested template evaluation
      value = value.valueOf() // disregard everything but the actual evaluated value
    }
    if (value === null || typeof value === 'undefined') {
      this.missing[expr] = true
      value = '[' + expr + ']' // missing value placeholder
    }
    if (value === '') {
      this.xmlStack.set(ident, undefined)
    } else if (typeof value === 'object') { // define should only be used to output simple scalar values into XML
      this.xmlStack.set(ident, value.toString()) // probably bad input; convert to a string representation
    } else {
      this.xmlStack.set(ident, value)
    }
  }

  beginCondition (ident, expr) {
    if (Scope.empty(this.contextStack)) {
      throw new Error('internal error: Cannot define a condition on an empty context stack')
    }
    const frame = this.contextStack
    if (frame._objType !== Scope.OBJECT) {
      throw new Error(`Internal error: cannot define a condition on a ${frame._objType} context`)
    }
    const evaluator = Engine.compileExpr(expr) // these are cached so this should be fast
    const value = frame._evaluate(evaluator) // we need to make sure this is memoized to avoid unnecessary re-evaluation
    const bValue = Scope.isTruthy(value)
    this.xmlStack.set(ident, bValue)
    return bValue
  }

  beginList (ident, expr) {
    const frame = this.contextStack
    const evaluator = Engine.compileExpr(expr) // these are cached so this should be fast
    const iterable = frame._evaluate(evaluator) // we need to make sure this is memoized to avoid unnecessary re-evaluation
    this.contextStack = Scope.pushList(iterable, this.contextStack, ident)
    const indices = this.contextStack._indices
    this.xmlStack.pushList(ident)
    return indices
  }

  endList () {
    this.xmlStack.popList()
    this.contextStack = Scope.pop(this.contextStack)
  }
}
module.exports = XmlAssembler
