'use strict';

const expressions= require('angular-expressions');
const ContextStack = require('./context-stack');

var xmlBuilder, contextStack;

const compile = function(expr) {
    if (expr == ".") expr = "this";
    return expressions.compile(expr);
}

const assembleXml = function (context, templateJsFile, joinstr = "") {
    xmlBuilder = ['<?xml version="1.0"?>'];
    contextStack = new ContextStack();
    const extractedLogic = require('./' + templateJsFile);
    extractedLogic.evaluate(context, this);
    return xmlBuilder.join(joinstr);
}
exports.assembleXml = assembleXml;

const beginObject = function (ident, objContext) {
    contextStack.pushObject(ident, objContext);
    xmlBuilder.push(`<${contextStack.peekName()}>`);
}
exports.beginObject = beginObject;

const endObject = function () {
    const frame = contextStack.popObject();
    xmlBuilder.push(`</${frame.name}>`);
}
exports.endObject = endObject;

const define = function (ident, expr) {
    if (contextStack.empty()) {
        throw 'internal error: Cannot define a member on an empty context stack';
    }
    const frame = contextStack.peek();
    if (frame.type != 'Object') {
        throw `Internal error: cannot define a member on a ${frame.type} context`;
    }

    const evaluator = compile(expr); // these are cached so this should be fast
    let value = evaluator(frame.context); // we need to make sure this is memoized to avoid unnecessary re-evaluation

    if (value === null || typeof value === 'undefined') {
        xmlBuilder.push(`<${ident}/>`);
    } else {
        xmlBuilder.push(`<${ident}>${value}</${ident}>`);
    }
}
exports.define = define;

const defineCondition = function (ident, expr, persist = true) {
    if (contextStack.empty()) {
        throw 'internal error: Cannot define a condition on an empty context stack';
    }
    const frame = contextStack.peek();
    if (frame.type != 'Object') {
        throw `Internal error: cannot define a condition on a ${frame.type} context`;
    }
    const evaluator = compile(expr); // these are cached so this should be fast
    const value = evaluator(frame.context); // we need to make sure this is memoized to avoid unnecessary re-evaluation
    const bValue = ContextStack.IsTruthy(value);
    if (persist) {
        xmlBuilder.push(`<${ident}>${bValue?'true':'false'}</${ident}>`);
    }
    return bValue;
}
exports.defineCondition = defineCondition;

const beginList = function (ident, expr) {
    const frame = contextStack.peek();
    const evaluator = compile(expr); // these are cached so this should be fast
    let iterable = evaluator(frame.context); // we need to make sure this is memoized to avoid unnecessary re-evaluation
    const indices = contextStack.pushList(ident, iterable);
    xmlBuilder.push(`<${ident}>`);
    return indices;
}
exports.beginList = beginList;

const endList = function () {
    const frame = contextStack.popList();
    xmlBuilder.push(`</${frame.name}>`);
}
exports.endList = endList;
