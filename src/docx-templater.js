console.log('Initializing edge-js...')
console.log(`  NUGET_PACKAGES = ${process.env.NUGET_PACKAGES}`)
console.log(`  USERPROFILE = ${process.env.USERPROFILE}`)
console.log(`  HOME = ${process.env.HOME}`)
console.log(`  OPENDOCX = ${__dirname}`)
const path = require('path')
const baseNetAppPath = path.join(__dirname, '..', 'OpenDocx.Templater', 'bin', 'Debug', 'net6.0')
process.env.EDGE_USE_CORECLR = '1'
console.log(`  EDGE_APP_ROOT = ${baseNetAppPath}`)
process.env.EDGE_APP_ROOT = baseNetAppPath

const util = require('util')
const edge = require('edge-js')
const baseDll = path.join(baseNetAppPath, 'OpenDocx.Templater.dll')

exports.extractFields = util.promisify(
  edge.func({
    assemblyFile: baseDll,
    typeName: 'OpenDocx.FieldExtractor',
    methodName: 'ExtractFieldsAsync'
  })
)

exports.compileTemplate = util.promisify(
  edge.func({
    assemblyFile: baseDll,
    typeName: 'OpenDocx.Templater',
    methodName: 'CompileTemplateAsync'
  })
)

exports.flattenFields = util.promisify(
  edge.func({
    assemblyFile: baseDll,
    typeName: 'OpenDocx.CCRemover',
    methodName: 'RemoveCCsAsync'
  })
)

exports.assembleDocument = util.promisify(
  edge.func({
    assemblyFile: baseDll,
    typeName: 'OpenDocx.Assembler',
    methodName: 'AssembleDocumentAsync'
  })
)

exports.validateDocument = util.promisify(
  edge.func({
    assemblyFile: baseDll,
    typeName: 'OpenDocx.Validator',
    methodName: 'ValidateDocumentAsync'
  })
)

exports.embedTaskPane = util.promisify(
  edge.func({
    assemblyFile: baseDll,
    typeName: 'OpenDocx.TaskPaneEmbedder',
    methodName: 'EmbedTaskPaneAsync'
  })
)

exports.removeTaskPane = util.promisify(
  edge.func({
    assemblyFile: baseDll,
    typeName: 'OpenDocx.TaskPaneEmbedder',
    methodName: 'RemoveTaskPaneAsync'
  })
)

exports.getTaskPaneInfo = util.promisify(
  edge.func({
    assemblyFile: baseDll,
    typeName: 'OpenDocx.TaskPaneEmbedder',
    methodName: 'GetTaskPaneInfoAsync'
  })
)
