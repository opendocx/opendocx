const path = require('path');
const baseNetAppPath = path.join(__dirname, 'OpenDocx.Templater/bin/Debug/netcoreapp2.1');
console.log('baseNetAppPath = ' + baseNetAppPath);
process.env.EDGE_USE_CORECLR = '2.1';
process.env.EDGE_APP_ROOT = baseNetAppPath;

const util = require('util');
const wu = require('wu');
const expressions= require('angular-expressions');
const format = require('date-fns/format');
const edge = require('edge-js');

const baseDll = path.join(baseNetAppPath, 'OpenDocx.Templater.dll');
const preprocessFunc = edge.func(
    {
        assemblyFile: baseDll,
        typeName: 'OpenDocx.Templater',
        methodName: 'PreProcessAsync' // This must be Func<object,Task<object>>
    }
);
const preprocess = util.promisify(preprocessFunc);
const assembleFunc = edge.func(
    {
        assemblyFile: baseDll,
        typeName: 'OpenDocx.Templater',
        methodName: 'AssembleAsync' // This must be Func<object,Task<object>>
    }
);
const assemble = util.promisify(assembleFunc);

// define filters for angular-expressions
expressions.filters.upper = function(input) {
    // This condition should be used to make sure that if your input is undefined, your output will be undefined as well and will not throw an error
    if(!input) return input;
    return input.toUpperCase();
}
expressions.filters.listca = function(input) {
    if(!input) return input;
    let every = ", ", last = " and ", only2 = " and ";
    const a = wu(input).toArray();
    if (a.length > 2)
        return a.slice(0, a.length - 1).join(every) + last + a[a.length-1];
    if (a.length == 2)
        return a[0] + only2 + a[1];
    if (a.length == 1)
        return a[0];
    // else
    return "";
}
expressions.filters.date = function(input, fmtStr) {
    // This condition should be used to make sure that if your input is undefined, your output will be undefined as well and will not throw an error
    if(!input) return input;
    return format(input, fmtStr);
}
expressions.filters.filt = function(input, predicateStr) {
    console.log('filter called; input = ' + input.toString() + ', predicate = ' + predicateStr.toString())
    if(!input || !Array.isArray(input) || !input.length) return input;
    const evaluator = expressions.compile(predicateStr);
    return input.filter(item => evaluator(item));
}
expressions.filters.each = function(input, expr) {
    if(!input || !Array.isArray(input) || !input.length) return input;
    const evaluator = expressions.compile(expr);
    const projected = input.map(item => evaluator(item));
    return projected;
}

function isNonStringIterable(obj) {
    // checks for null and undefined; also strings (though iterable) should not be iterable *contexts*
    if (obj == null || typeof obj == 'string') {
      return false;
    }
    return typeof obj[Symbol.iterator] === 'function';
}

exports.registerTemplate = async function(templateId) {

    const result = await preprocess({
        templateFile: templateId,
    });
    //console.log(result);
    console.log("JS: finished pre-processing template " + templateId);
    return result;
}

exports.assembleDocument = async function (templateId, data) {

    function pushContexts(parentId, newId, contextIterable)
    {
        const result = [];
        const parent = contextDict[parentId];
        const baseId = parentId + '\ufe19' + newId;
        let idx = 0;
        for (const subContext of contextIterable) {
            let iterId = baseId + '[' + idx.toString() + ']';
            if (iterId in contextDict) {
                contextDict[iterId].refCount++;
            }
            else {
                contextDict[iterId] = {
                    "context": subContext,
                    "parent": parent,
                    "index": idx,
                    "refCount": 1,
                };
                parent.refCount++;
            }
            result.push(iterId);
            idx++;
        }
        return result;
    }

    function popContext(contextId)
    {
        let result = false;
        let contextFrame = contextDict[contextId];
        if (contextFrame)
        {
            contextFrame.refCount--;
            if (contextFrame.refCount == 0)
            {
                contextFrame.parent.refCount--;
                delete contextFrame.context;
                delete contextDict[contextId];
                contextFrame = void 0;
                result = true;
            }
            return result;
        }
        return `Context '${contextId}' not found and therefore not removed.`;
    }

    function evaluateInContext(expr, contextId)
    {
        let result;
        let contextFrame = contextDict[contextId];
        if (expr == ".") {
            result = contextFrame.context;
        }
        else {
            const evaluator = expressions.compile(expr);
            do {
                result = evaluator(contextFrame.context);
            } while (result == null && (contextFrame = contextFrame.parent));
        }
        if (result == null) // unanswered
            result = '[' + expr + ']';
        return result;
    }

    const options = {
        templateFile: templateId,
        evaluateText: function (payload, callback) {
            // payload is {"contextId":"...", "expr":"..."}
            console.log("JS: evaluateText called; payload = " + JSON.stringify(payload));
            let result = evaluateInContext(payload.expr, payload.contextId);
            // result is expected to always be a string, since this is always called to get text for insertion into a document
            switch(typeof result) {
                case "number":
                case "boolean":
                case "object":
                    result = result.toString();
                    break;
            }
            const error = null; // set to an error, if one occurs
            console.log("JS: evaluateText is returning " + JSON.stringify(result));
            callback(error, result);
        },
        evaluateBool: function (payload, callback) {
            // payload is {"contextId":"...", "expr":"..."}
            console.log("JS: evaluateBool called; payload = " + JSON.stringify(payload));
            let value = evaluateInContext(payload.expr, payload.contextId);
            let result;
            let error;
            if (Array.isArray(value))
                result = (value.length > 0);
            else
                result = Boolean(value);
            console.log("JS: evaluateBlock is returning " + JSON.stringify(value));
            callback(error, result);
        },
        evaluateList: function(payload, callback) {
            // payload is {"contextId":"...", "expr":"..."}
            console.log("JS: evaluateList called; payload = " + JSON.stringify(payload));
            let value = evaluateInContext(payload.expr, payload.contextId);
            let result; // expected to always be an array of contextIds
            let error; // set to an error, if one occurs
            if (isNonStringIterable(value)) {
                result = pushContexts(payload.contextId, payload.expr, value);
            }
            else {
                error = `The selector '${payload.expr}' did not produce an iterable.`;
            }
            console.log("JS: evaluateList is returning " + JSON.stringify(result));
            callback(error, result);
        },
        releaseContext: function (contextId, callback) {
            console.log(`JS: releaseContext called on context '${contextId}'`);
            let error;
            let removed = false;
            if (contextId === '') {
                error = 'Unexpected request to release the root context.';
            }
            else {
                removed = popContext(contextId);
                if (typeof removed == "string") {
                    error = removed;
                    removed = false;
                }
            }
            console.log(`JS: releaseContext returning ${removed.toString()}.`);
            callback(error, removed);
        },
    };

    // contextDict is a dictionary/map from a "contextId" (a string that uniquely identifies an immutable data context)
    // and a JS object that contains that data context.
    // Each context is reference-counted, which allows new contexts to come into being arbitrarily, and stick around
    // until they're no longer needed by the asynchronous, sometimes out-of-order assembly process.
    const contextDict = {
        "": {
            "refCount": 1,
            "context": data,
        }
    };

    const result = await assemble(options);
    //console.log(result);
    console.log("JS: finished assembling template " + templateId);
    return result;
};