'use strict';

const { ContextStack, Engine } = require('yatte');
const version = require('./version');
const semver = require('semver')

class XmlAssembler {
    constructor (context, locals = null) {XmlAssembler
        this.context = context;
        this.locals = locals;
        this.missing = {};
        this.contextStack = new ContextStack();
    }

    loadTemplateModule(templateJsFile) {
        const thisVers = semver.major(version) + '.' + semver.minor(version)
        const extractedLogic = require(templateJsFile);
        const loadedVers = extractedLogic.version
        if (loadedVers && semver.eq(version, loadedVers) || semver.satisfies(loadedVers, thisVers)) {
            return extractedLogic
        } // else
        // invalidate loaded module with incorrect version!
        delete require.cache[require.resolve(templateJsFile)]
        throw new Error(`Version mismatch: Expecting template JavaScript version ${thisVers}.x, but JS file is version ${loadedVers}`)
    }

    assembleXml(templateJsFile, joinstr = "") {
        this.xmlBuilder = ['<?xml version="1.0"?>'];
        const extractedLogic = this.loadTemplateModule(templateJsFile);
        extractedLogic.evaluate(this.context, this.locals, this);
        return this.xmlBuilder.join(joinstr);
    }

    beginObject(ident, objContext, objLocals) {
        if (this.contextStack.empty()) {
            this.contextStack.pushGlobal(objContext, objLocals);
        } else {
            this.contextStack.pushObject(ident, objContext);
        }
        this.xmlBuilder.push(`<${this.contextStack.peekName()}>`);
    }
    
    endObject() {
        const frame = this.contextStack.popObject();
        this.xmlBuilder.push(`</${frame.name}>`);
    }
    
    define(ident, expr) {
        if (this.contextStack.empty()) {
            throw 'internal error: Cannot define a member on an empty context stack';
        }
        const frame = this.contextStack.peek();
        if (frame.type != 'Object') {
            throw `Internal error: cannot define a member on a ${frame.type} context`;
        }
    
        const evaluator = Engine.compileExpr(expr); // these are cached so this should be fast
        let value = frame.evaluate(evaluator); // we need to make sure this is memoized to avoid unnecessary re-evaluation
        if (value === null || typeof value === 'undefined') {
            this.missing[expr] = true;
            value = '[' + expr + ']'; // missing value placeholder
        }
        if (value === '') {
            this.xmlBuilder.push(`<${ident}/>`);
        } else {
            if (typeof value === 'string') {
                value = escapeXml(value);
            }
            this.xmlBuilder.push(`<${ident}>${value}</${ident}>`);
        }
    }
    
    beginCondition(ident, expr, persist = true) {
        if (this.contextStack.empty()) {
            throw 'internal error: Cannot define a condition on an empty context stack';
        }
        const frame = this.contextStack.peek();
        if (frame.type != 'Object') {
            throw `Internal error: cannot define a condition on a ${frame.type} context`;
        }
        const evaluator = Engine.compileExpr(expr); // these are cached so this should be fast
        const value = frame.evaluate(evaluator); // we need to make sure this is memoized to avoid unnecessary re-evaluation
        const bValue = ContextStack.IsTruthy(value);
        if (persist) {
            this.xmlBuilder.push(`<${ident}>${bValue?'true':'false'}</${ident}>`);
        }
        return bValue;
    }
    
    beginList(ident, expr) {
        const frame = this.contextStack.peek();
        const evaluator = Engine.compileExpr(expr); // these are cached so this should be fast
        let iterable = frame.evaluate(evaluator); // we need to make sure this is memoized to avoid unnecessary re-evaluation
        const indices = this.contextStack.pushList(ident, iterable);
        this.xmlBuilder.push(`<${ident}>`);
        return indices;
    }
    
    endList() {
        const frame = this.contextStack.popList();
        this.xmlBuilder.push(`</${frame.name}>`);
    }
}
module.exports = XmlAssembler;

const escapeXml = function (str) {
    return str.replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
        }
    });
}
