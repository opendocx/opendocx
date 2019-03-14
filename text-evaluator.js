'use strict';

const expressions= require('angular-expressions');
const Context = require('./context');
const OD = require('./fieldtypes');

var contextStack;

const assembleText = function (context, parsedTemplate) {
    contextStack = new Context();
    contextStack.pushObject('_top', context);
    let contextFrame = contextStack.peek();
    const text = parsedTemplate.map(contentItem => ContentReplacementTransform(contentItem, contextFrame)).join("");
    contextStack.popObject();
    contextStack = null;
    return text;
}
exports.assembleText = assembleText;

const compile = function(expr) {
    if (expr == ".") expr = "this";
    return expressions.compile(expr);
}

function ContentReplacementTransform(contentItem, contextFrame)
{
    if (!contentItem)
        return "";
    if (typeof contentItem == "string")
        return contentItem;
    if (typeof contentItem != "object")
        throw `Unexpected content '${contentItem}'`;
    const frame = contextStack.peek();
    if (frame.type != contextFrame.type || frame.parentFrame != contextFrame.parentFrame)
        throw `Internal error: unexpected context for recursive transform (sanity check failed)`;
    switch (contentItem.type) {
        case OD.Content:
            try {
                const evaluator = compile(contentItem.expr); // these are cached so this should be fast
                let value = evaluator(contextFrame.context); // we need to make sure this is memoized to avoid unnecessary re-evaluation
                if (value === null || typeof value === 'undefined') {
                    value = '[' + contentItem.expr + ']'; // missing value placeholder
                }
                return value;
            } catch (err) {
                return CreateContextErrorMessage("EvaluationException: " + err);
            }
        break;
        case OD.List:
            let iterable;
            try {
                const evaluator = compile(contentItem.expr); // these are cached so this should be fast
                iterable = evaluator(contextFrame.context); // we need to make sure this is memoized to avoid unnecessary re-evaluation
            } catch (err) {
                return CreateContextErrorMessage("EvaluationException: " + err);
            }
            const indices = contextStack.pushList(contentItem.expr, iterable);
            const allContent = indices.map(index => {
                contextStack.pushObject('o' + index, index);
                const listItemContent = contentItem.contentArray.map(listContentItem => ContentReplacementTransform(listContentItem, contextStack.peek()));
                contextStack.popObject();
                return listItemContent.join("");
            });
            contextStack.popList();
            return allContent.join("");
        break;
        case OD.If:
        case OD.ElseIf:
            let bValue;
            try {
                if (frame.type != 'Object') {
                    throw `Internal error: cannot define a condition directly in a ${frame.type} context`;
                }
                const evaluator = compile(contentItem.expr); // these are cached so this should be fast
                const value = evaluator(frame.context); // we need to make sure this is memoized to avoid unnecessary re-evaluation
                bValue = Context.IsTruthy(value);
            } catch (err) {
                return CreateContextErrorMessage("EvaluationException: " + err);
            }
            if (bValue)
            {
                const content = contentItem.contentArray
                    .filter(item => (typeof item != "object") || (item == null) || (item.type != OD.ElseIf && item.type != OD.Else))
                    .map(conditionalContentItem => ContentReplacementTransform(conditionalContentItem, frame));
                return content.join("");
            }
            let elseCond = contentItem.contentArray.find(item => (typeof item == "object" && item != null && (item.type == OD.ElseIf || item.type == OD.Else)));
            if (elseCond) {
                if (elseCond.type == OD.ElseIf)
                    return ContentReplacementTransform(elseCond, frame);
                // else
                const content = elseCond.contentArray
                    .map(conditionalContentItem => ContentReplacementTransform(conditionalContentItem, frame));
                return content.join("");
            }
            return "";
        break;
    }
}

function CreateContextErrorMessage(message) {
    return "*** " + message + " ***";
}

// const beginObject = function (ident, objContext) {
//     contextStack.pushObject(ident, objContext);
//     textBuilder.push(`<${contextStack.peekName()}>`);
// }
// exports.beginObject = beginObject;

// const endObject = function () {
//     const frame = contextStack.pop();
//     if (frame.type != 'Object')
//         throw `Internal error: expected Object stack frame, got ${frame.type} instead`;
//     textBuilder.push(`</${frame.name}>`);
// }
// exports.endObject = endObject;

// const define = function (ident, expr) {
//     if (contextStack.empty()) {
//         throw 'internal error: Cannot define a member on an empty context stack';
//     }
//     const frame = contextStack.peek();
//     if (frame.type != 'Object') {
//         throw `Internal error: cannot define a member on a ${frame.type} context`;
//     }

//     const evaluator = expressions.compile(expr); // these are cached so this should be fast
//     let value = evaluator(frame.context); // we need to make sure this is memoized to avoid unnecessary re-evaluation

//     if (value === null || typeof value === 'undefined') {
//         textBuilder.push(`<${ident}/>`);
//     } else {
//         textBuilder.push(`<${ident}>${value}</${ident}>`);
//     }
// }
// exports.define = define;

// const defineCondition = function (ident, expr, persist = true) {
//     if (contextStack.empty()) {
//         throw 'internal error: Cannot define a condition on an empty context stack';
//     }
//     const frame = contextStack.peek();
//     if (frame.type != 'Object') {
//         throw `Internal error: cannot define a condition on a ${frame.type} context`;
//     }
//     const evaluator = expressions.compile(expr); // these are cached so this should be fast
//     const value = evaluator(frame.context); // we need to make sure this is memoized to avoid unnecessary re-evaluation
//     let bValue;
//     if (Array.isArray(value)) {
//         bValue = (value.length > 0); // for purposes of if fields in knackly, we consider empty lists falsy! (unlike typical JavaScript, where all arrays are considered truthy.)
//     } else {
//         bValue = Boolean(value);
//     }
//     if (persist) {
//         textBuilder.push(`<${ident}>${bValue?'true':'false'}</${ident}>`);
//     }
//     return bValue;
// }
// exports.defineCondition = defineCondition;

// const beginList = function (ident, expr) {
//     const frame = contextStack.peek();
//     const evaluator = expressions.compile(expr); // these are cached so this should be fast
//     let iterable = evaluator(frame.context); // we need to make sure this is memoized to avoid unnecessary re-evaluation
//     const indices = contextStack.pushList(ident, iterable);
//     textBuilder.push(`<${ident}>`);
//     return indices;
// }
// exports.beginList = beginList;

// const endList = function () {
//     const frame = contextStack.pop();
//     if (frame.type != 'List')
//         throw `Internal error: expected List stack frame, got ${frame.type} instead`;
//     textBuilder.push(`</${frame.name}>`);
// }
// exports.endList = endList;
