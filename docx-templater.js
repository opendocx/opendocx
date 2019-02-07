const path = require('path');
const baseNetAppPath = path.join(__dirname, 'OpenDocx.Templater/bin/Debug/netcoreapp2.1');
console.log('baseNetAppPath = ' + baseNetAppPath);
process.env.EDGE_USE_CORECLR = '2.1';
process.env.EDGE_APP_ROOT = baseNetAppPath;

const util = require('util');
const edge = require('edge-js');
const baseDll = path.join(baseNetAppPath, 'OpenDocx.Templater.dll');

const preprocessFunc = edge.func(
    {
        assemblyFile: baseDll,
        typeName: 'OpenDocx.Templater',
        methodName: 'PreProcessAsync' // This must be Func<object,Task<object>>
    }
);
exports.prepareTemplate = util.promisify(preprocessFunc);

const assembleFunc = edge.func(
    {
        assemblyFile: baseDll,
        typeName: 'OpenDocx.Templater',
        methodName: 'AssembleAsync' // This must be Func<object,Task<object>>
    }
);
exports.assembleDocument = util.promisify(assembleFunc);
