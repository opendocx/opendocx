const path = require('path');
const baseNetAppPath = path.join(__dirname, '..', 'OpenDocx.Templater', 'bin', 'Debug', 'netcoreapp2.0');
//console.log('baseNetAppPath = ' + baseNetAppPath);
process.env.EDGE_USE_CORECLR = '2.0';
process.env.EDGE_APP_ROOT = baseNetAppPath;

const util = require('util');
const edge = require('edge-js');
const baseDll = path.join(baseNetAppPath, 'OpenDocx.Templater.dll');

exports.extractFields = util.promisify(
    edge.func({
        assemblyFile: baseDll,
        typeName: 'OpenDocx.FieldExtractor',
        methodName: 'ExtractFieldsAsync'
    })
);

exports.compileTemplate = util.promisify(
    edge.func({
        assemblyFile: baseDll,
        typeName: 'OpenDocx.Templater',
        methodName: 'CompileTemplateAsync'
    })
);

exports.assembleDocument = util.promisify(
    edge.func({
        assemblyFile: baseDll,
        typeName: 'OpenDocx.Assembler',
        methodName: 'AssembleDocumentAsync'
    })
);

exports.validateDocument = util.promisify(
    edge.func({
        assemblyFile: baseDll,
        typeName: 'OpenDocx.Validator',
        methodName: 'ValidateDocumentAsync'
    })
);
