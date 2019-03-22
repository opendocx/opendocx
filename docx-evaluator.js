'use strict';

const { ContextStack, Engine } = require('yatte');
const compileExpr = Engine.compileExpr;

var xmlBuilder, contextStack;

exports.assembleXml = function (context, templateJsFile, joinstr = "") {
    xmlBuilder = ['<?xml version="1.0"?>'];
    contextStack = new ContextStack();
    const extractedLogic = require('./' + templateJsFile);
    extractedLogic.evaluate(context, this);
    return xmlBuilder.join(joinstr);
}

exports.beginObject = function (ident, objContext) {
    contextStack.pushObject(ident, objContext);
    xmlBuilder.push(`<${contextStack.peekName()}>`);
}

exports.endObject = function () {
    const frame = contextStack.popObject();
    xmlBuilder.push(`</${frame.name}>`);
}

exports.define = function (ident, expr) {
    if (contextStack.empty()) {
        throw 'internal error: Cannot define a member on an empty context stack';
    }
    const frame = contextStack.peek();
    if (frame.type != 'Object') {
        throw `Internal error: cannot define a member on a ${frame.type} context`;
    }

    const evaluator = compileExpr(expr); // these are cached so this should be fast
    let value = evaluator(frame.context); // we need to make sure this is memoized to avoid unnecessary re-evaluation

    if (value === null || typeof value === 'undefined') {
        xmlBuilder.push(`<${ident}/>`);
    } else {
        xmlBuilder.push(`<${ident}>${value}</${ident}>`);
    }
}

exports.beginCondition = function (ident, expr, persist = true) {
    if (contextStack.empty()) {
        throw 'internal error: Cannot define a condition on an empty context stack';
    }
    const frame = contextStack.peek();
    if (frame.type != 'Object') {
        throw `Internal error: cannot define a condition on a ${frame.type} context`;
    }
    const evaluator = compileExpr(expr); // these are cached so this should be fast
    const value = evaluator(frame.context); // we need to make sure this is memoized to avoid unnecessary re-evaluation
    const bValue = ContextStack.IsTruthy(value);
    if (persist) {
        xmlBuilder.push(`<${ident}>${bValue?'true':'false'}</${ident}>`);
    }
    return bValue;
}

exports.beginList = function (ident, expr) {
    const frame = contextStack.peek();
    const evaluator = compileExpr(expr); // these are cached so this should be fast
    let iterable = evaluator(frame.context); // we need to make sure this is memoized to avoid unnecessary re-evaluation
    const indices = contextStack.pushList(ident, iterable);
    xmlBuilder.push(`<${ident}>`);
    return indices;
}

exports.endList = function () {
    const frame = contextStack.popList();
    xmlBuilder.push(`</${frame.name}>`);
}
