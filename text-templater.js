const util = require('util');
const OD = require('./fieldtypes');
const templateCache = {};

/* parseTemplate parses a text template (passed in as a string)
   into an object tree structure -- essentially a high-level AST for the template.
*/
exports.parseTemplate = function(template, parseFieldCallback)
{
    if (templateCache.hasOwnProperty(template))
        return templateCache[template];
    // if any fields are on a lines by themselves, remove the CR/LF following those fields
    template = template.replace(_blockFieldRE, `{$1}`);
    let templateSplit = template.split(_fieldRE);
    let astBody = [];
    if (templateSplit.length < 2) {  // no fields
        return template;
    }

    let i = 0;
    while (i < templateSplit.length) {
        const parsedContent = ParseContent(templateSplit, i, parseFieldCallback);
        if (parsedContent !== null) {
            if (typeof parsedContent == "object"
                && (    parsedContent.type == OD.EndList
                        || parsedContent.type == OD.EndIf
                        || parsedContent.type == OD.Else
                        || parsedContent.type == OD.ElseIf
                    )
                )
            {
                throw "Unmatched " + parsedContent.type;
            }
            astBody.push(parsedContent);
        }
        i++;
    }
    templateCache[template] = astBody;
    return astBody;
}

// CRLF handling:
// any field that's alone on a line of text (preceded by either a CRLF or the beginning of the string, and followed by a CRLF),
// needs to (during parsing) "consume" the CRLF that follows it, to avoid unexpected lines in the assembled output.

const _blockFieldRE = /(?<=\n|\r|^)\{\s*(\[[^{}]*?\])\s*\}(?:\r\n|\n|\r)/g;
const _fieldRE   = /\{\s*(\[.*?\])\s*\}/;
const _ifRE      = /\[\s*(?:if\b|\?)\s*(.*)\s*\]/;
const _elseifRE  = /\[\s*(?:elseif\b|\:\?)\s*(.*)\s*\]/;
const _elseRE    = /\[\s*(?:else|\:)\s*\]/;
const _endifRE   = /\[\s*(?:endif|\/\?)(?:.*)\]/;
const _listRE    = /\[\s*(?:list\b|\#)\s*(.*)\s*\]/;
const _endlistRE = /\[\s*(?:endlist|\/\#)(?:.*)\]/;

function ParseContentUntil(contentArray, startIdx, targetType, parseFieldCallback) {
    let idx = startIdx;
    let result = [];
    let parentContent = result;
    let elseEncountered = false;
    while (true) {
        const parsedContent = ParseContent(contentArray, idx, parseFieldCallback);
        const isObj = (typeof parsedContent == "object" && parsedContent !== null);
        idx++;
        if (isObj && parsedContent.type == targetType)
            break;
        if (parsedContent)
            parentContent.push(parsedContent);
        if (isObj && (parsedContent.type == OD.ElseIf || parsedContent.type == OD.Else))
        {
            if (targetType == OD.EndIf) {
                if (elseEncountered)
                    throw parsedContent.type + " cannot follow an Else";
                if (parsedContent.type == OD.Else)
                    elseEncountered = true;
                parentContent = parsedContent.contentArray;
            }
            else if (targetType == OD.EndList) {
                throw parsedContent.type + " cannot be in a List";
            }
        }
        if (isObj && (parsedContent.type == OD.EndIf || parsedContent.type == OD.EndList))
        {
            throw "Unmatched " + parsedContent.type;
        }
        if (idx >= contentArray.length)
            throw (targetType + " not found");
    };
    // remove all parsed items from the contentArray before returning
    contentArray.splice(startIdx, idx - startIdx);
    return result;
}

function ParseContent(contentArray, idx = 0, parseFieldCallback) {
    const content = contentArray[idx];
    if (content.length == 0)
        return null;
    if (content[0] == "[")
    {
        // parse the field
        let match, parsed;
        if ((match = _ifRE.exec(content)) !== null) {
            parsed = {type: OD.If, expr: match[1]};
            if (parseFieldCallback) parseFieldCallback(parsed);
            parsed.contentArray = ParseContentUntil(contentArray, idx + 1, OD.EndIf, parseFieldCallback);
        }
        else if ((match = _elseifRE.exec(content)) !== null) {
            parsed = {type: OD.ElseIf, expr: match[1]};
            if (parseFieldCallback) parseFieldCallback(parsed);
            parsed.contentArray = [];
        }
        else if (_elseRE.test(content)) {
            parsed = {type: OD.Else, contentArray: []};
        }
        else if (_endifRE.test(content)) {
            parsed = {type: OD.EndIf};
        }
        else if ((match = _listRE.exec(content)) !== null) {
            parsed = {type: OD.List, expr: match[1]};
            if (parseFieldCallback) parseFieldCallback(parsed);
            parsed.contentArray = ParseContentUntil(contentArray, idx + 1, OD.EndList, parseFieldCallback);
        }
        else if (_endlistRE.test(content)) {
            parsed = {type: OD.EndList};
        }
        else if (content[0] == "[" && content[content.length - 1] == "]")
        {
            parsed = {type: OD.Content, expr: content.substr(1, content.length-2).trim()};
        }
        else
            throw "Unrecognized field delimiters?";
        return parsed;
    }
    // else 
    return content; 
}

// class DataContextImpl
// {
//     constructor(source) {
//         this.evaluateText = util.promisify(source.evaluateText);
//         this.evaluateBool = util.promisify(source.evaluateBool);
//         this.evaluateList = util.promisify(source.evaluateList);
//         this.releaseContext = util.promisify(source.releaseContext);
//     }
// }

// class DataContext
// {
//     constructor(source, id = "") {
//         if (source.constructor.name == "DataContext")
//             this.internal = source.internal;
//         else
//             this.internal = new DataContextImpl(source);
//         this.contextId = id;
//     }

//     async EvaluateTextAsync(selector)
//     {
//         // try
//         // {
//             const payload = { contextId: this.contextId, expr: selector };
//             const result = await this.internal.evaluateText(payload);
//             return result;
//         // }
//         // catch (e)
//         // {
//         //     throw "EvaluationException: " + e;
//         // }
//     }

//     async EvaluateBoolAsync(selector)
//     {
//         // try
//         // {
//             const payload =  { contextId: this.contextId, expr: selector };
//             const result = await this.internal.evaluateBool(payload);
//             return result;
//         // }
//         // catch (e)
//         // {
//         //     throw "EvaluationException: " + e;
//         // }
//     }

//     async EvaluateListAsync(selector)
//     {
//         // try
//         // {
//             const payload = { contextId: this.contextId, expr: selector };
//             const result = await this.internal.evaluateList(payload);
//             if (Array.isArray(result))
//                 return result.map(contextId => new DataContext(this, contextId));
//             // else
//             throw "evaluateList result is not an array";
//         // }
//         // catch (Exception e)
//         // {
//         //     throw new EvaluationException("EvaluationException: " + e.Message, e);
//         // }
//     }

//     async ReleaseAsync()
//     {
//         const actuallyDisposed = await this.internal.releaseContext(this.contextId);
//     }
// }

// exports.assembleTextAsync = async function(options)
// {
//     const template = options.templateFile;
//     const dataContext = new DataContext(options);
//     const contentList = await exports.prepareText(options);
//     return (await Promise.all(contentList.map(contentItem => ContentReplacementTransformAsync(contentItem, dataContext)))).join("");
//     // const promises = [];
//     // for (const item of contentList) {
//     //     promises.push(ContentReplacementTransformAsync(item, dataContext));
//     // }
//     // //const promises = contentList.map(item => ContentReplacementTransform(item, data));
//     // const result = await Promise.all(promises);
//     // return result.join("");
// }

// async function ContentReplacementTransformAsync(contentItem, data)
// {
//     if (!contentItem)
//         return "";
//     if (typeof contentItem == "string")
//         return contentItem;
//     if (typeof contentItem != "object")
//         throw `Unexpected content '${contentItem}'`;
//     switch (contentItem.type) {
//         case OD.Content:
//             try {
//                 return await data.EvaluateTextAsync(contentItem.select);
//             } catch (err) {
//                 return CreateContextErrorMessage("EvaluationException: " + err);
//             }
//         break;
//         case OD.List:
//             let dataContextArray;
//             try {
//                 dataContextArray = await data.EvaluateListAsync(contentItem.select);
//             } catch (err) {
//                 return CreateContextErrorMessage("EvaluationException: " + err);
//             }
//             const repetitionPromiseArray = dataContextArray.map(async repetitionDataContext => {
//                 const contentItemPromiseArray = contentItem.contentArray.map(repetitionContentItem => ContentReplacementTransformAsync(repetitionContentItem, repetitionDataContext));
//                 const content = await Promise.all(contentItemPromiseArray);
//                 await repetitionDataContext.ReleaseAsync();
//                 return content.join("");
//             });
//             const allContent = await Promise.all(repetitionPromiseArray);
//             return allContent.join("");
//         break;
//         case OD.If:
//         case OD.ElseIf:
//             let testValue;
//             try {
//                 testValue = await data.EvaluateBoolAsync(contentItem.select);
//             } catch (err) {
//                 return CreateContextErrorMessage("EvaluationException: " + err);
//             }
//             if (testValue)
//             {
//                 const contentItemPromiseArray = contentItem.contentArray
//                     .filter(item => (typeof item != "object") || (item == null) || (item.type != OD.ElseIf && item.type != OD.Else))
//                     .map(conditionalContentItem => ContentReplacementTransformAsync(conditionalContentItem, data));
//                 const content = await Promise.all(contentItemPromiseArray);
//                 return content.join("");
//             }
//             let elseCond = contentItem.contentArray.find(item => (typeof item == "object" && item != null && (item.type == OD.ElseIf || item.type == OD.Else)));
//             if (elseCond) {
//                 if (elseCond.type == OD.ElseIf)
//                     return await ContentReplacementTransformAsync(elseCond, data);
//                 // else
//                 const contentItemPromiseArray = elseCond.contentArray
//                     .map(conditionalContentItem => ContentReplacementTransformAsync(conditionalContentItem, data));
//                 const content = await Promise.all(contentItemPromiseArray);
//                 return content.join("");
//             }
//             return "";
//         break;
//     }
// }

// function ContentReplacementTransform(contentItem, data)
// {
//     if (!contentItem)
//         return "";
//     if (typeof contentItem == "string")
//         return contentItem;
//     if (typeof contentItem != "object")
//         throw `Unexpected content '${contentItem}'`;
//     switch (contentItem.type) {
//         case OD.Content:
//             try {
//                 const evaluator = expressions.compile(contentItem.select); // these are cached so this should be fast
//                 return evaluator(data); // we need to make sure this is memoized to avoid unnecessary re-evaluation
//             } catch (err) {
//                 return CreateContextErrorMessage("EvaluationException: " + err);
//             }
//         break;
//         case OD.List:
//             let dataContextArray;
//             try {
//                 const evaluator = expressions.compile(contentItem.select); // these are cached so this should be fast
//                 let iterable = evaluator(data); // we need to make sure this is memoized to avoid unnecessary re-evaluation
            
//                 dataContextArray = await data.EvaluateListAsync();
//             } catch (err) {
//                 return CreateContextErrorMessage("EvaluationException: " + err);
//             }
//             const repetitionPromiseArray = dataContextArray.map(async repetitionDataContext => {
//                 const contentItemPromiseArray = contentItem.contentArray.map(repetitionContentItem => ContentReplacementTransformAsync(repetitionContentItem, repetitionDataContext));
//                 const content = await Promise.all(contentItemPromiseArray);
//                 await repetitionDataContext.ReleaseAsync();
//                 return content.join("");
//             });
//             const allContent = await Promise.all(repetitionPromiseArray);
//             return allContent.join("");
//         break;
//         case OD.If:
//         case OD.ElseIf:
//             let testValue;
//             try {
//                 testValue = await data.EvaluateBoolAsync(contentItem.select);
//             } catch (err) {
//                 return CreateContextErrorMessage("EvaluationException: " + err);
//             }
//             if (testValue)
//             {
//                 const contentItemPromiseArray = contentItem.contentArray
//                     .filter(item => (typeof item != "object") || (item == null) || (item.type != OD.ElseIf && item.type != OD.Else))
//                     .map(conditionalContentItem => ContentReplacementTransformAsync(conditionalContentItem, data));
//                 const content = await Promise.all(contentItemPromiseArray);
//                 return content.join("");
//             }
//             let elseCond = contentItem.contentArray.find(item => (typeof item == "object" && item != null && (item.type == OD.ElseIf || item.type == OD.Else)));
//             if (elseCond) {
//                 if (elseCond.type == OD.ElseIf)
//                     return await ContentReplacementTransformAsync(elseCond, data);
//                 // else
//                 const contentItemPromiseArray = elseCond.contentArray
//                     .map(conditionalContentItem => ContentReplacementTransformAsync(conditionalContentItem, data));
//                 const content = await Promise.all(contentItemPromiseArray);
//                 return content.join("");
//             }
//             return "";
//         break;
//     }
// }

// function CreateContextErrorMessage(message) {
//     return "*** " + message + " ***";
// }