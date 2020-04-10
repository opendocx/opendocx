'use strict'

const docxTemplater = require('./docx-templater')
const XmlAssembler = require('./docx-evaluator')
const yatte = require('yatte')
const fs = require('fs')
const OD = yatte.FieldTypes
const Atomizer = require('./string-atomizer')
const version = require('./version')
const loadTemplateModule = require('./load-template-module')

async function compileDocx (templatePath) {
  // secret second parameter:
  const cleanUpArtifacts = (arguments.length > 1) ? arguments[1] : true
  // first pre-process the given template file, which
  //    (1) leaves a unique "tag" on each field in the template, which we will use to refer to those fields later; and
  //    (2) extracts the content of each fields (in order) into a JSON file for further processing
  const options = { templateFile: templatePath }
  const result = await docxTemplater.extractFields(options)
  const fieldList = JSON.parse(fs.readFileSync(result.ExtractedFields, 'utf8'))
  // use the yatte engine to parse all the fields, creating an AST for the template
  const ast = yatte.Engine.parseContentArray(fieldList)
  // create a map from field ID to nodes in the AST, and save it in a temp file
  const fieldDict = {}
  const atoms = new Atomizer()
  buildFieldDictionary(ast, fieldDict, atoms) // this also atomizes expressions in fields
  const fieldDictPath = templatePath + 'obj.fields.json'
  fs.writeFileSync(fieldDictPath, JSON.stringify(fieldDict))
  // now use the pre-processed template and the field map to create a DocxGen template
  options.templateFile = result.TempTemplate
  options.originalTemplateFile = templatePath
  options.fieldInfoFile = fieldDictPath
  const ttpl = await docxTemplater.compileTemplate(options)
  ttpl.Template = templatePath
  // simplify the logic of the AST and save it for potential future use
  const simplifiedAstPath = templatePath + '.json'
  const rast = yatte.Engine.buildLogicTree(ast) // prunes logically insignificant nodes from ast
  fs.writeFileSync(simplifiedAstPath, JSON.stringify(rast))
  ttpl.ExtractedLogicTree = simplifiedAstPath
  // use the simplified AST to create a JS function turns a OpenDocx data context
  // into DocxGen XML matched to the template
  const outputJsPath = templatePath + '.js'
  fs.writeFileSync(outputJsPath, createTemplateJsModule(rast, atoms))
  ttpl.ExtractedLogic = outputJsPath
  // will be investingating other ways of processing the AST dynamically,
  // so maybe we just write out the .json rather than .js at all?  Might be more secure.

  // clean up interim/temp/obj files
  if (cleanUpArtifacts) {
    fs.unlinkSync(result.ExtractedFields)
    fs.unlinkSync(fieldDictPath)
    fs.unlinkSync(result.TempTemplate)
  } else {
    ttpl.ExtractedFields = result.ExtractedFields
    ttpl.FieldMap = fieldDictPath
    ttpl.TempTemplate = result.TempTemplate
  }
  // result looks like:
  // {
  //      Template: "c:\path\to\template.docx",
  //      ExtractedLogic: "c:\path\to\template.docx.js",
  //      ExtractedLogicTree: "c:\path\to\template.docx.json",
  //      DocxGenTemplate: "c:\path\to\template.docxgen.docx",
  //      HasErrors: false,
  //      Errors: [], // if there are errors, this is an array of strings
  // }
  return ttpl
}
compileDocx.version = version
exports.compileDocx = compileDocx

async function validateCompiledDocx (templatePath) {
  // templatePath should have been compiled (previously) so the expected files will be on disk
  // but if not we'll compile it now
  const extractedLogic = templatePath + '.js'
  const docxGenTemplate = templatePath + 'gen.docx'
  let needRegen = false
  if (!fs.existsSync(extractedLogic) || !fs.existsSync(docxGenTemplate)) {
    console.log('Warning: compiled template not found; generating. Pre-compile to maximize performance\n    '
      + templatePath)
    needRegen = true
  } else {
    try {
      loadTemplateModule(extractedLogic)
    } catch (e) {
      console.log('Warning: ' + e.toString()
        + '\nPre-compile templates when upgrading to avoid performance penalty on first use\n    ' + templatePath)
      needRegen = true
    }
  }
  let compileResult
  if (needRegen) {
    compileResult = await compileDocx(templatePath)
  } else {
    compileResult = {
      Template: templatePath,
      HasErrors: false,
      ExtractedLogic: extractedLogic,
      ExtractedLogicTree: templatePath + '.json',
      DocxGenTemplate: docxGenTemplate,
    }
  }
  return compileResult
}
validateCompiledDocx.version = version
exports.validateCompiledDocx = validateCompiledDocx

async function assembleDocx (templatePath, outputFile, data, locals, optionalSaveXmlFile) {
  // templatePath should have been compiled (previously) so the expected files will be on disk
  // but if not we'll compile it now
  let result
  const { ExtractedLogic, DocxGenTemplate } = await validateCompiledDocx(templatePath)
  const dataAssembler = new XmlAssembler(data)
  const xmlData = dataAssembler.assembleXml(ExtractedLogic)
  if (!dataAssembler.errors || dataAssembler.errors.length === 0) {
    try {
      if (optionalSaveXmlFile) {
        fs.writeFileSync(optionalSaveXmlFile, xmlData)
      }
      result = await docxTemplater.assembleDocument({
        templateFile: DocxGenTemplate,
        xmlData,
        documentFile: outputFile,
      })
      result.Missing = Object.keys(dataAssembler.missing)
      result.Errors = []
    } catch (e) {
      result = {
        Document: undefined,
        Missing: Object.keys(dataAssembler.missing),
        Errors: [e.message],
        HasErrors: true,
      }
    }
  } else { // errors were encountered while creating the XML -- don't asm
    if (optionalSaveXmlFile) {
      fs.writeFileSync(optionalSaveXmlFile, dataAssembler.errors.join('\n'))
    }
    result = {
      Document: undefined,
      Missing: Object.keys(dataAssembler.missing),
      Errors: dataAssembler.errors,
      HasErrors: true,
    }
  }
  return result
}
assembleDocx.version = version
exports.assembleDocx = assembleDocx

const buildFieldDictionary = function (astBody, fieldDict, atoms, parent = null) {
  for (const obj of astBody) {
    if (Array.isArray(obj.contentArray)) {
      buildFieldDictionary(obj.contentArray, fieldDict, atoms, obj)
    }
    if (typeof obj.id !== 'undefined') {
      // EndList fields are stored with the atomized expression of their matching List field,
      // because this is used to make list punctuation work
      fieldDict[obj.id] = {
        fieldType: obj.type,
        atomizedExpr: (
          obj.expr
            ? atoms.get(obj.expr)
            : (
              obj.type === OD.EndList
                ? atoms.get(parent.expr)
                : ''
            )
        )
      }
    }
  }
}

const createTemplateJsModule = function (ast, atoms) {
  const sb = ["'use strict';"]
  sb.push(`exports.version='${version}';`)
  sb.push('exports.evaluate=function(cx,cl,h)')
  sb.push(serializeContextInDataJs(ast, '_odx', 'cx', 'cl', atoms, null))
  return sb.join('\n')
}

const serializeContextInDataJs = function (contentArray, id, objIdent, locIdent, atoms, parentNode) {
  return `{
h.beginObject('${id}',${objIdent}${locIdent ? (',' + locIdent) : ''});
${serializeContentArrayAsDataJs(contentArray, atoms, parentNode)}
h.endObject()
}`
}

const serializeAstNodeAsDataJs = function (astNode, atoms, parent) {
  let atom
  if (astNode.expr) {
    if (astNode.expr === '_punc') {
      // special case: list punctuation: use a customized "atom" derived from the list expression
      atom = atoms.get(parent.expr) + '1'
    } else if (astNode.type === OD.If || astNode.type === OD.ElseIf) {
      // special case: evaluating an expression for purposes of determining its truthiness rather than its actual value
      atom = atoms.get(astNode.expr) + '2'
    } else { // regular case: atom based on expression
      atom = atoms.get(astNode.expr)
    }
  }
  switch (astNode.type) {
    case OD.Content:
      return `h.define('${atom}','${astNode.expr}');`

    case OD.List: {
      const a0 = atom + '0' // special atom representing individual items in the list, rather than the entire list
      return `for(const ${a0} of h.beginList('${atom}', '${astNode.expr}'))
${serializeContextInDataJs(astNode.contentArray, a0, a0, '', atoms, astNode)}
h.endList();`
    }

    case OD.If:
      return `if(h.beginCondition('${atom}','${astNode.expr}'))
{
${serializeContentArrayAsDataJs(astNode.contentArray, atoms, astNode)}
}`

    case OD.ElseIf:
      return `} else {
if(h.beginCondition('${atom}','${astNode.expr}'))
{
${serializeContentArrayAsDataJs(astNode.contentArray, atoms, astNode)}
}`

    case OD.Else:
      return `} else {
${serializeContentArrayAsDataJs(astNode.contentArray, atoms, astNode)}
`

    default:
      throw new Error('unexpected node type -- unable to serialize')
  }
}

const serializeContentArrayAsDataJs = function (contentArray, atoms, parent) {
  const sb = []
  for (const obj of contentArray) {
    sb.push(serializeAstNodeAsDataJs(obj, atoms, parent))
  }
  return sb.join('\n')
}
