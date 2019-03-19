const docxTemplater = require('./docx-templater');
const docxEvaluator = require('./docx-evaluator');
const engine = require('yatte');

exports.compileDocx = async function(templatePath) {
    engine.initFieldParsing(templatePath);
    const options = {
        templateFile: templatePath,
        parseField: engine.parseFieldCallback
    };
    let result = await docxTemplater.compileTemplate(options);
    engine.finalizeFieldParsing(templatePath);
    // result looks like:
    // {
    //      HasErrors: false,
    //      ExtractedLogic: "c:\path\to\template.docx.js",
    //      DocxGenTemplate: "c:\path\to\template.docxgen.docx",
    // }
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
    // result looks like:
    // {
    //      HasErrors: false,
    //      Document: "c:\path\to\document.docx"
    // }
    return result;
}
