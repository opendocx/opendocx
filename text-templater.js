const util = require('util');
const templateCache = {};

exports.prepareText = function(options)
{
    return new Promise((resolve, reject) => {
        let template = options.templateFile;
        if (templateCache.hasOwnProperty(template))
            resolve(templateCache[template]);
        // if any fields are on a lines by themselves, remove the CR/LF following those fields
        template = template.replace(_blockFieldRE, `{$1}`);
        let templateSplit = template.split(_fieldRE);
        let result = [];
        if (templateSplit.length < 2) { // no fields
            resolve(template);
        }
        try {
            let i = 0;
            while (i < templateSplit.length) {
                const parsedContent = ParseContent(templateSplit, i);
                if (parsedContent !== null) {
                    if (typeof parsedContent == "object"
                        && (    parsedContent.type == PA.EndRepeat
                             || parsedContent.type == PA.EndConditional
                             || parsedContent.type == PA.Else
                             || parsedContent.type == PA.ElseConditional
                           )
                       )
                    {
                        throw "Unmatched " + parsedContent.type;
                    }
                    result.push(parsedContent);
                }
                i++;
            }
            templateCache[template] = result;
            resolve(result);
        } catch (error) {
            reject(error);
        }
    });
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

const PA = {
    Content: "Content",
    Conditional: "Conditional",
    ElseConditional: "ElseConditional",
    Else: "Else",
    EndConditional: "EndConditional",
    Repeat: "Repeat",
    EndRepeat: "EndRepeat",
};

function ParseContentUntil(contentArray, startIdx, targetType) {
    let idx = startIdx;
    let result = [];
    let parentContent = result;
    let elseEncountered = false;
    while (true) {
        const parsedContent = ParseContent(contentArray, idx);
        const isObj = (typeof parsedContent == "object" && parsedContent !== null);
        idx++;
        if (isObj && parsedContent.type == targetType)
            break;
        if (parsedContent)
            parentContent.push(parsedContent);
        if (isObj && (parsedContent.type == PA.ElseConditional || parsedContent.type == PA.Else))
        {
            if (targetType == PA.EndConditional) {
                if (elseEncountered)
                    throw parsedContent.type + " cannot follow an Else";
                if (parsedContent.type == PA.Else)
                    elseEncountered = true;
                parentContent = parsedContent.contentArray;
            }
            else if (targetType == PA.EndRepeat) {
                throw parsedContent.type + " cannot be in a Repeat";
            }
        }
        if (isObj && (parsedContent.type == PA.EndConditional || parsedContent.type == PA.EndRepeat))
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

function ParseContent(contentArray, idx = 0) {
    const content = contentArray[idx];
    if (content.length == 0)
        return null;
    if (content[0] == "[")
    {
        // parse the field
        let match, parsed;
        if ((match = _ifRE.exec(content)) !== null) {
            parsed = {type: PA.Conditional, select: match[1]};
            parsed.contentArray = ParseContentUntil(contentArray, idx + 1, PA.EndConditional);
        }
        else if ((match = _elseifRE.exec(content)) !== null) {
            parsed = {type: PA.ElseConditional, select: match[1], contentArray: []};
        }
        else if (_elseRE.test(content)) {
            parsed = {type: PA.Else, contentArray: []};
        }
        else if (_endifRE.test(content)) {
            parsed = {type: PA.EndConditional};
        }
        else if ((match = _listRE.exec(content)) !== null) {
            parsed = {type: PA.Repeat, select: match[1]};
            parsed.contentArray = ParseContentUntil(contentArray, idx + 1, PA.EndRepeat);
        }
        else if (_endlistRE.test(content)) {
            parsed = {type: PA.EndRepeat};
        }
        else if (content[0] == "[" && content[content.length - 1] == "]")
        {
            parsed = {type: PA.Content, select: content.substr(1, content.length-2).trim()};
        }
        else
            throw "Unrecognized field delimiters?";
        return parsed;
    }
    // else 
    return content; 
}

class DataContextImpl
{
    constructor(source) {
        this.evaluateText = util.promisify(source.evaluateText);
        this.evaluateBool = util.promisify(source.evaluateBool);
        this.evaluateList = util.promisify(source.evaluateList);
        this.releaseContext = util.promisify(source.releaseContext);
    }
}

class DataContext
{
    constructor(source, id = "") {
        if (source.constructor.name == "DataContext")
            this.internal = source.internal;
        else
            this.internal = new DataContextImpl(source);
        this.contextId = id;
    }

    async EvaluateTextAsync(selector)
    {
        // try
        // {
            const payload = { contextId: this.contextId, expr: selector };
            const result = await this.internal.evaluateText(payload);
            return result;
        // }
        // catch (e)
        // {
        //     throw "EvaluationException: " + e;
        // }
    }

    async EvaluateBoolAsync(selector)
    {
        // try
        // {
            const payload =  { contextId: this.contextId, expr: selector };
            const result = await this.internal.evaluateBool(payload);
            return result;
        // }
        // catch (e)
        // {
        //     throw "EvaluationException: " + e;
        // }
    }

    async EvaluateListAsync(selector)
    {
        // try
        // {
            const payload = { contextId: this.contextId, expr: selector };
            const result = await this.internal.evaluateList(payload);
            if (Array.isArray(result))
                return result.map(contextId => new DataContext(this, contextId));
            // else
            throw "evaluateList result is not an array";
        // }
        // catch (Exception e)
        // {
        //     throw new EvaluationException("EvaluationException: " + e.Message, e);
        // }
    }

    async ReleaseAsync()
    {
        const actuallyDisposed = await this.internal.releaseContext(this.contextId);
    }
}

exports.assembleText = async function(options)
{
    const template = options.templateFile;
    const dataContext = new DataContext(options);
    const contentList = await exports.prepareText(options);
    return (await Promise.all(contentList.map(contentItem => ContentReplacementTransformAsync(contentItem, dataContext)))).join("");
    // const promises = [];
    // for (const item of contentList) {
    //     promises.push(ContentReplacementTransformAsync(item, dataContext));
    // }
    // //const promises = contentList.map(item => ContentReplacementTransform(item, data));
    // const result = await Promise.all(promises);
    // return result.join("");
}

async function ContentReplacementTransformAsync(contentItem, data)
{
    if (!contentItem)
        return "";
    if (typeof contentItem == "string")
        return contentItem;
    if (typeof contentItem != "object")
        throw `Unexpected content '${contentItem}'`;
    switch (contentItem.type) {
        case PA.Content:
            try {
                return await data.EvaluateTextAsync(contentItem.select);
            } catch (err) {
                return CreateContextErrorMessage("EvaluationException: " + err);
            }
        break;
        case PA.Repeat:
            let dataContextArray;
            try {
                dataContextArray = await data.EvaluateListAsync(contentItem.select);
            } catch (err) {
                return CreateContextErrorMessage("EvaluationException: " + err);
            }
            const repetitionPromiseArray = dataContextArray.map(async repetitionDataContext => {
                const contentItemPromiseArray = contentItem.contentArray.map(repetitionContentItem => ContentReplacementTransformAsync(repetitionContentItem, repetitionDataContext));
                const content = await Promise.all(contentItemPromiseArray);
                await repetitionDataContext.ReleaseAsync();
                return content.join("");
            });
            const allContent = await Promise.all(repetitionPromiseArray);
            return allContent.join("");
        break;
        case PA.Conditional:
        case PA.ElseConditional:
            let testValue;
            try {
                testValue = await data.EvaluateBoolAsync(contentItem.select);
            } catch (err) {
                return CreateContextErrorMessage("EvaluationException: " + err);
            }
            if (testValue)
            {
                const contentItemPromiseArray = contentItem.contentArray
                    .filter(item => (typeof item != "object") || (item == null) || (item.type != PA.ElseConditional && item.type != PA.Else))
                    .map(conditionalContentItem => ContentReplacementTransformAsync(conditionalContentItem, data));
                const content = await Promise.all(contentItemPromiseArray);
                return content.join("");
            }
            let elseCond = contentItem.contentArray.find(item => (typeof item == "object" && item != null && (item.type == PA.ElseConditional || item.type == PA.Else)));
            if (elseCond) {
                if (elseCond.type == PA.ElseConditional)
                    return await ContentReplacementTransformAsync(elseCond, data);
                // else
                const contentItemPromiseArray = elseCond.contentArray
                    .map(conditionalContentItem => ContentReplacementTransformAsync(conditionalContentItem, data));
                const content = await Promise.all(contentItemPromiseArray);
                return content.join("");
            }
            return "";
        break;
    }
}

function CreateContextErrorMessage(message) {
    return "*** " + message + " ***";
}