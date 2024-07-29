/*
This file is a significantly modified version of docx-evaluator.js. It changes the way
evaluation works for DOCX templates: instead of executing a template-specific .js module
(which had to be produced at compile time), it operates on a .json file instead.
The template-specific .js modules are being deprecated.
This file originated in the dev-indirect-asm branch, and in that branch, it handles
indirect virtuals (inserts) differently than is done in this file. The primary difference
is, in this code, this.indirects is an array of plain JS objects, whereas in the other
branch, this.indirects is an array of instances of IndirectVirtual (so they can easily
be recognized later during serialization, so XML and JSON serializers can handle them
differently). In this version of the file, since this branch uses only XML, it has been
tweaked to handle IndirectVirtuals the same way the old docx-evaluator.js did it.
*/
const { Scope, Engine, IndirectVirtual, FieldTypes: OD } = require('yatte')
const uuidv4 = require('uuid/v4')
const DataAggregator = require('./data-aggregator')
const loadTemplateLogic = require('./load-template-logic')

class IndirectAssembler {
  constructor (scope) {
    this.indirects = []
    this.missing = {}
    this.errors = []
    this.contextStack = null
    if (scope) {
      this.contextStack = Scope.pushObject(scope, this.contextStack)
    }
    this.data = new DataAggregator()
  }

  assembleData (logicTree) { // was createTemplateJsModule
    try {
      // evaluate each expression in the top-level context
      this._assembleContextFields(logicTree, null)
      // close/end top-level object context
      this.contextStack = Scope.pop(this.contextStack)
      this.data.popObject()
      return this.data
    } catch (e) {
      this.errors.push(e.message)
    }
  }

  assembleXml (templateJsFile) {
    try {
      // load extracted logic instead of template module:
      const extractedLogic = loadTemplateLogic(templateJsFile)
      return this.assembleData(extractedLogic).toXml('_odx')
    } catch (e) {
      this.errors.push(e.message)
    }
  }

  _assembleContextFields (contentArray, parent) { // was serializeContentArrayAsDataJs
    for (const obj of contentArray) {
      this._assembleField(obj)
    }
    if (parent && parent.type === OD.List) {
      // _punc node, if included in old contentArray, will have been ignored by assembleNode
      // so here we explicitly evaluate and set the list punctuation
      this._setContent(parent.atom ? parent.atom + 'p' : parent.expr + '_PUNC', '_punc')
    }
  }

  _assembleField (node) { // was serializeAstNodeAsDataJs
    switch (node.type) {
      case OD.Content:
        if (node.expr === '_punc') return // ignore _punc content nodes (deprecated since 2.0.0-alpha)
        this._setContent(node.atom || node.expr, node.expr)
        break

      case OD.List:
        this._assembleListContext(node)
        break

      case OD.If:
      case OD.ElseIf:
        this._assembleConditionalContext(node)
        break

      case OD.Else:
        this._assembleContextFields(node.contentArray, node)
        break

      default:
        throw new Error('unexpected node type -- unable to process')
    }
  }

  _assembleListContext (node) {
    // begin list context:
    const frame = this.contextStack
    const evaluator = Engine.compileExpr(node.expr)
    const iterable = frame.evaluate(evaluator)
    this.contextStack = Scope.pushList(iterable || [], this.contextStack)
    const indices = this.contextStack.indices
    this.data.pushList(node.atom || node.expr)
    // set data for each row
    // atom to represent an individual item in the list
    const itemAtom = node.atom ? node.atom + 'i' : node.expr + '_ITEM'
    for (const itemIndex of indices) {
      // was serializeContextInDataJs
      // begin child object context -- individual item in a list context
      this.contextStack = Scope.pushListItem(itemIndex, this.contextStack)
      this.data.pushObject(itemAtom)
      // evaluate each expression in this context
      this._assembleContextFields(node.contentArray, node)
      // end object context
      this.contextStack = Scope.pop(this.contextStack)
      this.data.popObject()
    }
    // end list context:
    this.data.popList()
    this.contextStack = Scope.pop(this.contextStack)
  }

  _assembleConditionalContext (node) {
    let conditionalContents = node.contentArray
    const lastNode = conditionalContents.length && conditionalContents[conditionalContents.length - 1]
    let elseNode
    if (lastNode) {
      if (lastNode.type === OD.Else || lastNode.type === OD.ElseIf) {
        elseNode = lastNode
        conditionalContents = conditionalContents.slice(0, -1)
      }
    }
    // atom to represent only the **truthiness** value of node.expr
    const boolAtom = node.atom ? node.atom + 'b' : node.expr + '_BOOL'
    if (this._setCondition(boolAtom, node.expr)) {
      this._assembleContextFields(conditionalContents, node)
    } else if (elseNode) {
      // remember, continuation may be EITHER an ElseIf OR an Else...
      this._assembleField(elseNode)
    }
  }

  _setContent (ident, expr) { // used to be define
    const frame = this.contextStack
    if (Scope.empty(frame)) {
      throw new Error('internal error: Cannot set data with an empty context stack')
    }
    if (frame.frameType === Scope.LIST) {
      throw new Error(`Evaluation error: cannot retrieve a member '${expr}' (${
        ident}) from a LIST; found a LIST when expecting a SINGLE object`)
      // error message & handling on this needs work, but it happens when a list context (which represent an
      // array of objects) actually contains an array OF ARRAYS of objects (nested instead of flat).
      // Caller is attempting to set 'ident' from an item in the outer list, and it fails
      // with this error because the item on which the lookup is being performed is, itself, another list.
    }
    const evaluator = Engine.compileExpr(expr)
    let value = frame.evaluate(evaluator)
    if (value === null || typeof value === 'undefined') {
      this.missing[expr] = true
      value = this._missingValuePlaceholder(expr, evaluator.ast)
    } else if (typeof value === 'object') {
      if (value instanceof IndirectVirtual) { // different from dev-indirect-asm branch:
        // new (doesn't work same): this.data.set(ident, this._indirectLookup(value))
        this.data.set(ident, this._indirectSub(value)) // old (url substitution works differently)
        return
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
      this.data.set(ident, undefined)
    } else if (typeof value === 'object') { // setContent should only be used to output simple scalar values
      this.data.set(ident, value.toString()) // probably bad input; convert to a string representation
    } else {
      this.data.set(ident, value)
    }
  }

  _indirectLookup (indirObj) { // warning: new implementation from dev-indirect-asm branch...
    // see if this indirect has already been encountered/added
    let indirect = this.indirects.find(ex => ex.isEqualTo(indirObj))
    if (!indirect) {
      indirect = new IndirectVirtual(indirObj) // { ...indirObj, id: uuidv4() }
      indirect.id = uuidv4()
      this.indirects.push(indirect)
    }
    return indirect
  }

  _indirectSub (indirect) { // warning: old implementation from doc-evaluator...
    if (indirect.contentType !== 'text') { // docx, markdown, etc... substitute special placeholder
      // see if this indirect has already been encountered/added
      let existing = this.indirects.find(ex => Object.keys(indirect).every(propName => {
        const indPropVal = indirect[propName]
        return (indPropVal && (indPropVal instanceof Scope))
          ? indPropVal.valueEqualTo(ex[propName])
          : indPropVal === ex[propName]
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

  _setCondition (ident, expr) { // used to be beginCondition
    const frame = this.contextStack
    if (Scope.empty(frame)) {
      throw new Error('internal error: Cannot set a condition with an empty context stack')
    }
    if (frame.frameType !== Scope.OBJECT && frame.frameType !== Scope.PRIMITIVE) {
      throw new Error(`Internal error: cannot set a condition with a ${frame.frameType} context`)
    }
    const evaluator = Engine.compileExpr(expr) // these are cached so this should be fast
    const value = frame.evaluate(evaluator) // this ought to be memoized to avoid unnecessary re-evaluation
    const bValue = Scope.isTruthy(value)
    this.data.set(ident, bValue)
    return bValue
  }

  _missingValuePlaceholder (expr, ast) {
    if (ast && ast.type === Engine.AST.AngularFilterExpression) {
      return this._missingValuePlaceholder(Engine.serializeAST(ast.input))
    }
    return '[' + expr + ']'
  }
}
module.exports = IndirectAssembler
