'use strict';

const docxTemplater = require('./docx-templater');
const XmlAssembler = require('./docx-evaluator');
const yatte = require('yatte');
const fs = require('fs');
const OD = yatte.FieldTypes;
const atomize = require('./string-atomizer');
const version = require('./version');

exports.compileDocx = async function(templatePath) {
    // secret second parameter:
    const cleanUpArtifacts = (arguments.length > 1) ? arguments[1] : true;
    // first pre-process the given template file, which
    //    (1) leaves a unique "tag" on each field in the template, which we will use to refer to those fields later; and
    //    (2) extracts the content of each fields (in order) into a JSON file for further processing
    let options = { templateFile: templatePath };
    let result = await docxTemplater.extractFields(options); // could pass true as second parameter to force synchronous if there's a need
    let fieldList = JSON.parse(fs.readFileSync(result.ExtractedFields, 'utf8'));
    // use the yatte engine to parse all the fields, creating an AST for the template
    let ast = yatte.Engine.parseContentArray(fieldList); // makes template ast; parses, normalizes & caches all expressions
    // create a map from field ID to nodes in the AST, and save it in a temp file
    let fieldDict = {};
    atomize('###reset###');
    buildFieldDictionary(ast, fieldDict); // this also atomizes expressions in fields
    const fieldDictPath = templatePath + "obj.fields.json";
    fs.writeFileSync(fieldDictPath, JSON.stringify(fieldDict));
    // now use the pre-processed template and the field map to create a DocxGen template
    options.templateFile = result.TempTemplate;
    options.originalTemplateFile = templatePath;
    options.fieldInfoFile = fieldDictPath;
    let ttpl = await docxTemplater.compileTemplate(options);
    // simplify the logic of the AST and save it for potential future use
    const simplifiedAstPath = templatePath + ".json";
    let rast = yatte.Engine.buildLogicTree(ast); // prunes logically insignificant nodes from ast
    fs.writeFileSync(simplifiedAstPath, JSON.stringify(rast));
    ttpl.ExtractedLogicTree = simplifiedAstPath;
    // use the simplified AST to create a JS function turns a OpenDocx data context into DocxGen XML matched to the template
    const outputJsPath = templatePath + ".js";
    fs.writeFileSync(outputJsPath, createTemplateJsModule(rast, fieldDict));
    ttpl.ExtractedLogic = outputJsPath;
    // will be investingating other ways of processing the AST dynamically, so maybe we just write out the .json rather than .js at all?  Might be more secure.
    //let dataEvaluator = compileData(rast) // returns function(contextObj) that returns xml string translated according to logic
    // and some way to process ast to extract and rationalize relevance & requirement info

    // clean up interim/temp/obj files
    if (cleanUpArtifacts) {
        fs.unlinkSync(result.ExtractedFields);
        fs.unlinkSync(fieldDictPath);
        fs.unlinkSync(result.TempTemplate);
    } else {
        ttpl.ExtractedFields = result.ExtractedFields;
        ttpl.FieldMap = fieldDictPath;
        ttpl.TempTemplate = result.TempTemplate;
    }
    // result looks like:
    // {
    //      HasErrors: false,
    //      ExtractedLogic: "c:\path\to\template.docx.js",
    //      ExtractedLogicTree: "c:\path\to\template.docx.json",
    //      DocxGenTemplate: "c:\path\to\template.docxgen.docx",
    // }
    return ttpl;
}

exports.assembleDocx = async function (templatePath, outputFile, data, locals) {
    // templatePath should have been compiled (previously) so the expected files will be on disk
    // but if not we'll compile it now
    let extractedLogic = templatePath + '.js';
    let docxGenTemplate = templatePath + 'gen.docx';
    if (!fs.existsSync(extractedLogic) || !fs.existsSync(docxGenTemplate)) {
        console.log('Warning: compiled template files not found; generating. Please pre-compile templates to avoid terrible performance.');
        const compileResult = await exports.compileDocx(templatePath);
        extractedLogic = compileResult.ExtractedLogic;
        docxGenTemplate = compileResult.DocxGenTemplate;
    }
    const dataAssembler = new XmlAssembler(data, locals)
    const options = {
        templateFile: docxGenTemplate,
        xmlData: dataAssembler.assembleXml(extractedLogic),
        documentFile: outputFile,
    };
    let result = await docxTemplater.assembleDocument(options);
    result.Missing = Object.keys(dataAssembler.missing)
    // result looks like:
    // {
    //      HasErrors: false,
    //      Document: "c:\path\to\document.docx",
    //      Missing: ["expr1", "expr2", ...]
    // }
    return result;
}

const buildFieldDictionary = function (astBody, fieldDict, parent = null) {
    for (const obj of astBody) {
        if (Array.isArray(obj.contentArray)) {
            buildFieldDictionary(obj.contentArray, fieldDict, obj);
        }
        if (typeof obj.id !== 'undefined') {
            // EndList fields are stored with the atomized expression of their matching List field, because this is used to make list punctuation work
            fieldDict[obj.id] = {fieldType: obj.type, atomizedExpr: (obj.expr ? atomize(obj.expr) : (obj.type == OD.EndList ? atomize(parent.expr) : ''))};
        }
    }
}

const createTemplateJsModule = function(ast) {
    const sb = ["'use strict';"];
    sb.push(`exports.version='${version}';`)
    sb.push('exports.evaluate=function(cx,cl,h)');
    sb.push(serializeContextInDataJs(ast, '_odx', 'cx', 'cl', null));
    return sb.join('\n');
}

const serializeContextInDataJs = function(contentArray, id, objIdent, locIdent, parentNode) {
    return `{
h.beginObject('${id}',${objIdent}${locIdent ? (','+locIdent):''});
${serializeContentArrayAsDataJs(contentArray, parentNode)}
h.endObject()
}`
}

const serializeAstNodeAsDataJs = function(astNode, parent) {
    let atom;
    if (astNode.expr) {
        if (astNode.expr === '_punc') { // special case: list punctuation: use a customized "atom" derived from the list expression
            atom = atomize(parent.expr) + '1'
        } else { // regular case: atom based on expression
            atom = atomize(astNode.expr);
        }
    } 
    switch (astNode.type) {
        case OD.Content:
            return `h.define('${atom}','${astNode.expr}');`

        case OD.List:
            let a0 = atom + '0';
            return `for(const ${a0} of h.beginList('${atom}', '${astNode.expr}'))
${serializeContextInDataJs(astNode.contentArray, a0, a0, '', astNode)}
h.endList();`

        case OD.If:
            return `if(h.beginCondition('${atom}','${astNode.expr}',${astNode.new}))
{
${serializeContentArrayAsDataJs(astNode.contentArray, astNode)}
}`

        case OD.ElseIf:
            return `} else {
if(h.beginCondition('${atom}','${astNode.expr}',${astNode.new}))
{
${serializeContentArrayAsDataJs(astNode.contentArray, astNode)}
}`

        case OD.Else:
            return `} else {
${serializeContentArrayAsDataJs(astNode.contentArray, astNode)}
`

        default:
            throw "unexpected node type -- unable to serialize"
    }
}

const serializeContentArrayAsDataJs = function(contentArray, parent) {
    let sb = [];
    for (const obj of contentArray) {
        sb.push(serializeAstNodeAsDataJs(obj, parent));
    }
    return sb.join('\n');
}
