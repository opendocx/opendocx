/* eslint-disable comma-dangle */
'use strict'

const docxTemplater = require('./docx-templater')
const XmlAssembler = require('./docx-evaluator')
const yatte = require('yatte')
const fs = require('fs')
// const { Transform } = require('stream')
const OD = yatte.FieldTypes
const Atomizer = require('./field-expr-namer')
const version = require('./version')
const loadTemplateModule = require('./load-template-module')
const { docxToMarkdown, markdownToDocx } = require('./pandoc')
// const asyncPool = require('tiny-async-pool')

/**
 * Transform an OpenDocx template to produce the following reusable artifacts:
 *   * DocxGenTemplate (a DOCX template compatible with DocxGen/OpenXmlPowerTools)
 *   * ExtractedLogicTree (a Yatte 'template AST' containing a minimal "logic tree":
 *     encapsulates all data and transformations that the template calls for)
 *   * ExtractedLogic (a CommonJS module that will dynamically transform
 *     any Yatte data context into an XML data file compatible with the above
 *     DocxGen/OpenXmlPowerTools template)
 *   * Preview (a markdown-format template representing a preview of the template's content)
 *   * HasErrors (a boolean value indicating whether errors were encountered in the transformation)
 *   * Errors (an array of strings representing error messages encountered in the transformation)
 *
 * Intended to be called once whenever a new template or version is put into service. The artifacts it
 * creates on disk then remain in place and act as a cache to prevent unnecessary work, as re-creating
 * these artifacts is relatively expensive.
 *
 * @param {string} templatePath the path to the OpenDocx template on the local disk
 * @param {boolean} removeCustomProperties whether to remove any custom document properties
 *                                         that may be embedded in the OpenDocx template itself
 * @param {array of string} keepPropertyNames If removeCustomProperties is true, this is a list of
 *                                            names of custom properties that should be ignored
 *                                            through that process. Essentially, it means
 *                                            remove all custom properties EXCEPT these.
 * @param {boolean} cleanUpArtifacts whether interim artifacts created during the transformation process
 *                                   should be cleaned up (the default) or left in place for diagnistic purposes
 */
async function compileDocx (
  templatePath,
  removeCustomProperties = true,
  keepPropertyNames = [],
  cleanUpArtifacts = true
) {
  // first pre-process the given template file, which
  //    (1) leaves a unique "tag" on each field in the template, which we will use to refer to those fields later; and
  //    (2) extracts the content of each fields (in order) into a JSON file for further processing
  // This initial step also strips out and/or leaves in the requested custom properties of the template.
  const options = {
    templateFile: templatePath,
    removeCustomProperties,
    keepPropertyNames
  }
  const result = await docxTemplater.extractFields(options)
  options.originalTemplateFile = templatePath
  options.templateFile = result.TempTemplate
  const previewPromise = docxTemplater.flattenFields(options)
  const fieldList = JSON.parse(fs.readFileSync(result.ExtractedFields, 'utf8'))
  const fieldLookup = indexFields(fieldList)
  // use the yatte engine to parse all the fields, creating an AST for the template
  const ast = yatte.Engine.parseContentArray(fieldList)
  // create a map from field ID to nodes in the AST, and save it in a temp file
  const fieldDict = {}
  const atoms = new Atomizer()
  buildFieldDictionary(ast, fieldDict, atoms) // this also atomizes expressions in fields
  // note: as of 2.0.0-alpha, it ALSO mutates ast, adding atom annotations for expressions
  const fieldDictPath = templatePath + 'obj.fields.json'
  fs.writeFileSync(fieldDictPath, JSON.stringify(fieldDict)) // JSON Dictionary <string fieldNum, object atomizedExpr>
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
  // use the simplified AST to dynamically create CommonJS module capable of creating a DocxGen XML data file
  // (matched to the DocxGen template) from any OpenDocx/Yatte data context
  const outputJsPath = templatePath + '.js'
  fs.writeFileSync(outputJsPath, createTemplateJsModule(rast))
  ttpl.ExtractedLogic = outputJsPath
  // NOTE: we will be investingating other ways of processing the AST dynamically,
  // so maybe we just write out the .json rather than .js/CommonJS module at all?  Might be more secure.
  // The hangup is that the .js contains the necessary atomized expressions, and the .json does not.
  let previewResult
  try {
    previewResult = await previewPromise // make sure this is done before cleanup
    // TODO: the following streaming code works, but the converted Markdown ends with a line break (\n) that we want
    // to truncate, and I am not sure how to do that with the streaming code.  So we are reading everything into memory
    // instead, for now.
    // const fieldReplaceTransform = new Transform({
    //   transform (chunk, encoding, callback) {
    //     const schunk = chunk.toString('utf-8')
    //       .replace(/\r\n/g, '\n')
    //     schunk.split(/=:(\d+):=/g)
    //       .forEach((item, index) => {
    //         if (index % 2 === 0) {
    //           this.push(item)
    //         } else {
    //           this.push(`{[${fieldLookup[item]}]}`)
    //         }
    //       })
    //     callback()
    //   }
    // })
    // const translatedPreviewPromise = new Promise((resolve, reject) => {
    //   const inputStream = fs.createReadStream(previewResult.DocxGenTemplate)
    //   const outputStream = fs.createWriteStream(templatePath + '.md')
    //   docxToMarkdown.stream(inputStream)
    //     .pipe(fieldReplaceTransform)
    //     .pipe(outputStream)
    //     .on('finish', resolve)
    //     .on('error', reject)
    // })
    // await translatedPreviewPromise

    const markdownStream = docxToMarkdown.stream(fs.createReadStream(previewResult.DocxGenTemplate))
    const chunks = []
    for await (const chunk of markdownStream) {
      chunks.push(chunk)
    }
    const buffer = Buffer.concat(chunks)
    let previewStr = buffer.toString('utf-8')
      .replace(/\r\n/g, '\n') // normalize line breaks
    if (previewStr.endsWith('\n')) {
      previewStr = previewStr.slice(0, -1) // truncate final line break
    }
    // reconstitute fields
    previewStr = previewStr.split(/=:(\d+):=/g)
      .map((item, index) => (index % 2) === 0 ? item : `{[${fieldLookup[item]}]}`)
      .join('')
    // ensure the converted preview string is a valid yatte text template! (otherwise error)
    const compiledPreview = yatte.compileText(previewStr)
    if (!compiledPreview.error) {
      // persist in preview file
      await fs.promises.writeFile((ttpl.Preview = templatePath + '.md'), previewStr, 'utf-8')
    } else {
      console.log(`Warning: unable to generate valid markdown preview for template ${templatePath}`)
    }
  } catch (err) {
    console.error(err)
  }
  // clean up interim/temp/obj files
  if (cleanUpArtifacts) {
    fs.unlinkSync(result.ExtractedFields)
    fs.unlinkSync(fieldDictPath)
    fs.unlinkSync(result.TempTemplate)
    if (previewResult && previewResult.DocxGenTemplate) {
      fs.unlinkSync(previewResult.DocxGenTemplate)
    }
  } else {
    ttpl.ExtractedFields = result.ExtractedFields
    ttpl.FieldMap = fieldDictPath
    ttpl.TempTemplate = result.TempTemplate
    if (previewResult && previewResult.DocxGenTemplate) {
      ttpl.TempPreview = previewResult.DocxGenTemplate
    }
  }
  // result looks like:
  // {
  //      Template: "c:\path\to\template.docx",
  //      ExtractedLogic: "c:\path\to\template.docx.js",
  //      ExtractedLogicTree: "c:\path\to\template.docx.json",
  //      DocxGenTemplate: "c:\path\to\template.docxgen.docx",
  //      Preview: "c:\path\to\template.docx.md",
  //      HasErrors: false,
  //      Errors: [], // if there are errors, this is an array of strings
  // }
  return ttpl
}
compileDocx.version = version
exports.compileDocx = compileDocx

/**
 * Does the minimal work to ensure that an OpenDocx template has been compiled/transformed
 * for use with DocxGen/OpenXmlPowerTools. Performs transformations only if required artifacts
 * do not already exist OR if they are outdated versions that no longer function correctly.
 *
 * @param {string} templatePath the path to the OpenDocx template on the local disk
 */
async function validateCompiledDocx (templatePath) {
  // templatePath should have been compiled (previously) so the expected files will be on disk
  // but if not we'll compile it now
  const extractedLogic = templatePath + '.js'
  const docxGenTemplate = templatePath + 'gen.docx'
  const previewTemplate = templatePath + '.md'
  let needRegen = false
  if (!fs.existsSync(extractedLogic) || !fs.existsSync(docxGenTemplate)) {
    console.log(
      'Warning: compiled template not found; generating. Pre-compile to maximize performance\n    ' + templatePath)
    needRegen = true
  } else {
    try {
      loadTemplateModule(extractedLogic)
    } catch (e) {
      console.log('Warning: ' + e.toString() +
        '\nPre-compile templates when upgrading to avoid performance penalty on first use\n    ' + templatePath)
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
    if (fs.existsSync(previewTemplate)) {
      compileResult.Preview = previewTemplate
    }
  }
  return compileResult
}
validateCompiledDocx.version = version
exports.validateCompiledDocx = validateCompiledDocx

/**
 * Assemble a DOCX file from an OpenDocx template and a Yatte data context. Produces a DOCX file as output.
 *
 * @param {string|object} template either the path to the OpenDocx template on the local disk, or an object
 *                                 that can be resolved TO such a path by getTemplatePath().
 *                                 Note that for optimal performance, a matching *gen.docx template should
 *                                 already exist in the same directory, as is normally ensured by calling
 *                                 validateCompiledDocx() whenever a template or version is put into service.
 * @param {string} outputFile the path on disk to which the output document should be saved
 * @param {object} data the Yatte data context on which the assembled document will be based
 * @param {func} getTemplatePath if the provided template is anything but a simple string, this must be an
 *                               async function capable of taking that (whatever) as input, retrieving or
 *                               locating the template as an actual file on disk, and returning the path to that file
 * @param {string} optionalSaveXmlFile Normally the transformed XML data file (an interim artifact of assembly) is
 *                                     not output; however if this parameter is provided (for diagnostic purposes),
 *                                     the interim XML data file will be saved to the provided path
 */
async function assembleDocx (template, outputFile, data, getTemplatePath, optionalSaveXmlFile) {
  // recursively create all XML and "tap out" all inserts
  // (so by the time we get to the .NET code below, we've already gotten all the templates!)
  const dataAssembler = await assembleData(template, data, getTemplatePath)
  const { templateFile, xmlData, indirects, missing, errors } = dataAssembler
  const dataSuccess = !errors || !errors.length
  if (optionalSaveXmlFile) {
    fs.writeFileSync(optionalSaveXmlFile, dataSuccess ? xmlData : errors.join('\n'))
  }
  if (!dataSuccess) {
    return ({
      Document: undefined,
      Missing: Object.keys(missing),
      Errors: errors,
      HasErrors: true,
    })
  }
  // recursively assemble inserted indirects and convert markdown to DOCX (if necessary)
  await processIndirects(indirects, templateFile, optionalSaveXmlFile)
  // finally assemble the main document and compose it with its inserts (if any)
  return assembleDocxWithIndirects(templateFile, xmlData, indirects, missing, outputFile)
}
assembleDocx.version = version
exports.assembleDocx = assembleDocx

async function assembleData (template, data, getTemplatePath) {
  if (typeof template !== 'string' && typeof getTemplatePath === 'function') {
    template = await getTemplatePath(template)
  }
  // template should have been compiled (previously) so the expected files will be on disk
  // but if not we'll compile it now
  const { ExtractedLogic, DocxGenTemplate } = await validateCompiledDocx(template)
  const dataAssembler = new XmlAssembler(data)
  dataAssembler.templateFile = DocxGenTemplate
  dataAssembler.xmlData = dataAssembler.assembleXml(ExtractedLogic)
  if (!dataAssembler.errors || !dataAssembler.errors.length) {
    // assemble data for inserted indirects if there are any
    if (dataAssembler.indirects && dataAssembler.indirects.length > 0) {
      for (const indir of dataAssembler.indirects) {
        if (!indir.contentType || indir.contentType === 'docx') {
          indir.assembledData = await assembleData(indir, indir.scope, getTemplatePath)
        }
      }
    }
  }
  return dataAssembler
}

async function processIndirects (indirects, parentTemplateFile, optionalSaveXmlFile) {
  if (!indirects) return
  for (const indir of indirects) {
    if ((indir.contentType === 'markdown' || indir.contentType === 'text') && indir.toString) {
      const mdContent = indir.toString() // todo: get Missing and Errors from this (if any) and pass on below!
      const buffer = await markdownToDocx(mdContent, parentTemplateFile)
      indir.result = {
        Bytes: buffer,
        Document: null,
        Missing: [],
        Errors: [],
        HasErrors: false
      }
    } else if (!indir.contentType || indir.contentType === 'docx') {
      // indir.assembledData was initialized by assembleData()'s recursive descent
      const { templateFile, xmlData, indirects, missing } = indir.assembledData
      if (optionalSaveXmlFile) {
        fs.writeFileSync(templateFile + '_interim_data.xml', xmlData)
      }
      await processIndirects(indirects, templateFile, optionalSaveXmlFile)
      indir.result = await assembleDocxWithIndirects(templateFile, xmlData, indirects, missing, null)
      if (optionalSaveXmlFile) {
        fs.writeFileSync(templateFile + '_interim_assembled.docx', indir.result.Bytes)
      }
    } else {
      throw new Error(`Unexpected '${indir.contentType}' content type encountered during indirect processing`)
    }
  }
}

async function assembleDocxWithIndirects (templateFile, xmlData, indirects, missingObj, outputFile = null) {
  // const hasInserts = indirects && indirects.length > 0
  // try {
  // transform indirects into OXPT DocumentComposer sources:
  const sources = []
  const errors = []
  for (const sub of indirects) {
    if (sub.result.Missing) {
      sub.result.Missing.forEach(m => {
        missingObj[m] = true
      })
    }
    if (sub.result.Errors) {
      sub.result.Errors.forEach(e => {
        errors.push(e)
      })
    }
    sources.push({ id: sub.id, buffer: sub.result.Bytes, keepSections: Boolean(sub.KeepSections) })
  }
  // assemble document (which now takes care of compositing inserts too)
  const mainDoc = await docxTemplater.assembleDocument({
    templateFile,
    xmlData,
    sources,
    documentFile: outputFile,
  })
  if (mainDoc.HasErrors) {
    errors.unshift('Assembly error')
  }
  const result = mainDoc
  result.Missing = Object.keys(missingObj)
  result.Errors = errors
  return result
}

const indexFields = function (fieldList, lookup = []) {
  for (const fldObj of fieldList) {
    if (Array.isArray(fldObj)) {
      indexFields(fldObj, lookup)
    } else {
      lookup[fldObj.id] = fldObj.content
    }
  }
  return lookup
}

const buildFieldDictionary = function (astBody, fieldDict, atoms, parent = null) {
  for (const obj of astBody) {
    if (Array.isArray(obj.contentArray)) {
      buildFieldDictionary(obj.contentArray, fieldDict, atoms, obj)
    }
    if (typeof obj.id !== 'undefined') {
      const fieldObj = {
        fieldType: obj.type
      }
      if (obj.expr) {
        fieldObj.expr = obj.expr
        fieldObj.atomizedExpr = atoms.getFieldAtom(obj)
        // also cross-pollinate atomizedExpr across to ast (for later use)
        obj.atom = fieldObj.atomizedExpr
      } else {
        fieldObj.parent = parent.id
        // EndList fields are also stored with the atomized expression of their matching List field,
        // because this is (or at least, used to be?) needed to make list punctuation work
        if (obj.type === OD.EndList) {
          fieldObj.atomizedExpr = atoms.getFieldAtom(parent)
        }
      }
      fieldDict[obj.id] = fieldObj
    }
  }
}

const createTemplateJsModule = function (ast) {
  const sb = ["'use strict';"]
  sb.push(`exports.version='${version}';`)
  sb.push('exports.evaluate=function(cx,cl,h)')
  sb.push(serializeContextInDataJs(ast, '_odx', 'cx', 'cl', null))
  return sb.join('\n')
}

const serializeContextInDataJs = function (contentArray, id, objIdent, locIdent, parentNode) {
  return `{
h.beginObject('${id}',${objIdent}${locIdent ? (',' + locIdent) : ''});
${serializeContentArrayAsDataJs(contentArray, parentNode)}
h.endObject()
}`
}

const serializeAstNodeAsDataJs = function (astNode, parent) {
  let atom
  if (astNode.expr) {
    if (astNode.expr === '_punc') {
      // special case: list punctuation: use a customized "atom" derived from the list expression
      atom = parent.atom + 'p'
    } else if (astNode.type === OD.If || astNode.type === OD.ElseIf) {
      // special case: evaluating an expression for purposes of determining its truthiness rather than its actual value
      atom = astNode.atom + 'b'
    } else { // regular case: atom based on expression
      atom = astNode.atom
    }
  }
  switch (astNode.type) {
    case OD.Content:
      return `h.define('${atom}','${escapeExpressionStr(astNode.expr)}');`

    case OD.List: {
      const a0 = atom + 'i' // special atom representing individual items in the list, rather than the entire list
      return `for(const ${a0} of h.beginList('${atom}', '${escapeExpressionStr(astNode.expr)}'))
${serializeContextInDataJs(astNode.contentArray, a0, a0, '', astNode)}
h.endList();`
    }

    case OD.If:
      return `if(h.beginCondition('${atom}','${escapeExpressionStr(astNode.expr)}'))
{
${serializeContentArrayAsDataJs(astNode.contentArray, astNode)}
}`

    case OD.ElseIf:
      return `} else {
if(h.beginCondition('${atom}','${escapeExpressionStr(astNode.expr)}'))
{
${serializeContentArrayAsDataJs(astNode.contentArray, astNode)}
}`

    case OD.Else:
      return `} else {
${serializeContentArrayAsDataJs(astNode.contentArray, astNode)}
`

    default:
      throw new Error('unexpected node type -- unable to serialize')
  }
}

const serializeContentArrayAsDataJs = function (contentArray, parent) {
  const sb = []
  for (const obj of contentArray) {
    sb.push(serializeAstNodeAsDataJs(obj, parent))
  }
  // in 2.0.0-alpha, we stopped including _punc nodes in the contentArray
  // but the Js (insofar as we will actually use it?) still needs to capture the _punc, so synthesize it here
  if (parent && parent.type === OD.List) {
    var lastItem = !contentArray.length || contentArray[contentArray.length - 1]
    if (!lastItem || lastItem.type !== OD.Content || lastItem.expr !== '_punc') {
      sb.push(serializeAstNodeAsDataJs({ type: OD.Content, expr: '_punc' }, parent))
    }
  }
  return sb.join('\n')
}

const singleQuotes = /(?<=\\\\)'|(?<!\\)'/g

const escapeExpressionStr = function (strExpr) {
  return strExpr.replace(singleQuotes, "\\'")
}
