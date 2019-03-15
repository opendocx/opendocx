const docxTemplater = require('./docx-templater');
const textTemplater = require('./text-templater');
const docxEvaluator = require('./docx-evaluator');
const textEvaluator = require('./text-evaluator');
const expressions= require('angular-expressions');
const format = require('date-fns/format');

// define built-in filters (todo: more needed)
expressions.filters.upper = function(input) {
    if(!input) return input;
    return input.toUpperCase();
}
expressions.filters.lower = function(input) {
    if(!input) return input;
    return input.toLowerCase();
}
expressions.filters.initcap = function(input, forceLower = false) {
    if(!input) return input;
    if (forceLower) input = input.toLowerCase();
    return input.charAt(0).toUpperCase() + input.slice(1);
}
expressions.filters.titlecaps = function(input, forceLower = false) {
    if(!input) return input;
    if (forceLower) input = input.toLowerCase();
    return input.replace(/(^| )(\w)/g, s => s.toUpperCase());
}
expressions.filters.date = function(input, fmtStr) {
    // This condition should be used to make sure that if your input is undefined, your output will be undefined as well and will not throw an error
    if(!input) return input;
    return format(input, fmtStr);
}
expressions.filters.ordsuffix = function(input) {
    if(!input) return input;
    switch (input % 10) {
        case 1: return "st";
        case 2: return "nd";
        case 3: return "rd";
        default: return "th";
    }
}

const compile = function(expr) {
    if (expr == ".") expr = "this";
    return expressions.compile(expr);
}

var templateCache = {};
var fieldCache;

const parseField = function(fieldObj, callback) {
    // fieldObj is an object with two properties:
    //   type (string): the field type
    //   expr (string): the expression within the field that wants to be parsed
    let error = null;
    let compiledExpr;
    try {
        compiledExpr = compile(fieldObj.expr);
    } catch (err) {
        error = err;
    }
    fieldCache[fieldObj.expr] = error ? error : compiledExpr;
    if (callback) { // async
        callback(error, compiledExpr);
    } else { // synchronous
        if (error) throw error;
        return compiledExpr;
    }
};

exports.compileText = function (template) {
    fieldCache = {};
    let result = textTemplater.parseTemplate(template, parseField);
    templateCache[template] = fieldCache;
    fieldCache = void 0;
    return {
        TemplateAST: result,
        HasErrors: null
    };
}

exports.compileDocx = async function(templatePath) {
    fieldCache = {};
    const options = {
        templateFile: templatePath,
        parseField: parseField
    };
    let result = await docxTemplater.compileTemplate(options);
    templateCache[templatePath] = fieldCache;
    fieldCache = void 0;
    return result;
}

exports.assembleText = function (template, data) {
    let compiled = textTemplater.parseTemplate(template); // this fetches result out of a cache if it's already been called
    let result = textEvaluator.assembleText(data, compiled);
    return result;
}

exports.assembleDocx = async function (templatePath, data, outputFile) {
    // templatePath needs to have been compiled (previously) so the expected files will be on disk
    //const result = await openDocx.compileDocx(templatePath);
    const options = {
        templateFile: templatePath + "gen.docx",
        xmlData: docxEvaluator.assembleXml(data, './' + templatePath + ".js"),
        documentFile: outputFile,
    };
    let result = await docxTemplater.assembleDocument(options);
    return result;
}

// exports.assembleDocument = async function (templateId, data) {


//     // contextDict is a dictionary/map from a "contextId" (a string that uniquely identifies an immutable data context)
//     // and a JS object that contains that data context.
//     // Each context is reference-counted, which allows new contexts to come into being arbitrarily, and stick around
//     // until they're no longer needed by the asynchronous, sometimes out-of-order assembly process.
//     const contextDict = {
//         "": {
//             "refCount": 1,
//             "context": data,
//         }
//     };

//     let result;
//     if (templateId.slice(-5).toLowerCase()==".docx") {
//         result = await docxTemplater.assembleDocument(options);
//     }
//     else {
//         result = await textTemplater.assembleText(options);
//     }
//     return result;
// };