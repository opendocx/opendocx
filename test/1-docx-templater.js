/* eslint-disable no-unused-vars */
const { describe, it } = require('mocha')
const opendocx = require('../src/index')
const templater = require('../src/docx-templater')
// const TestHelperTypes = yatte.TestHelperTypes
const assert = require('assert')
const fs = require('fs')
const testUtil = require('./test-utils')

describe('Extracting fields from DOCX templates (white box)', async function () {
  const cases = [
    { template: 'SimpleWill.docx' },
    { template: 'text_field_formatting.docx' },
    { template: 'fieldmatch-cc.docx' },
    { template: 'fieldmatch-text.docx' },
    { template: 'header-footer-cc.docx' },
    { template: 'header-footer-text.docx' },
    { template: 'conditional_margin.docx' },
    { template: 'notext.docx' }
    // { template: 'conditional_margin_nb.docx' },
    // disabled because it *doesn't* produce those artifacts, because
    // (1) OXPT doesn't yet support having section breaks on the same paragraph as a Conditional/EndConditional tags! and
    // (2) OpenDocx's "transform" process (patterned after OXPT's assembly code) also mistakenly discards such section breaks.
  ]

  cases
    .forEach(({ template }) => {
      it('should produce expected interim artifacts when compiling ' + template, async function () {
        this.timeout(10000) // definitely shouldn't take that long!!  But it can occasionally take a couple/few seconds.
        this.slow(2500)

        const templatePath = testUtil.GetTemplatePath(template)
        const result = await opendocx.compileDocx(templatePath, undefined, undefined, false) // suppress cleanup of interim artifacts during compilation
        // results of initial field extraction:
        assert(fs.existsSync(result.ExtractedFields))
        let fields
        assert.doesNotThrow(() => {
          fields = JSON.parse(fs.readFileSync(result.ExtractedFields, 'utf8'))
        })
        const validation = await templater.validateDocument({ documentFile: result.TempTemplate })
        assert.ok(!validation.HasErrors, validation.ErrorList)
        assert(fs.existsSync(result.FieldMap))
        let fieldMap
        assert.doesNotThrow(() => {
          fieldMap = JSON.parse(fs.readFileSync(result.FieldMap, 'utf8'))
        })
        assert(fs.existsSync(result.ExtractedLogicTree))
        let astLogic
        assert.doesNotThrow(() => {
          astLogic = JSON.parse(fs.readFileSync(result.ExtractedLogicTree, 'utf8'))
        })
        assert(fs.existsSync(result.ExtractedLogic))
        let jsfunc
        assert.doesNotThrow(() => {
          jsfunc = require(result.ExtractedLogic)
        })
        const validation2 = await templater.validateDocument({ documentFile: result.DocxGenTemplate })
        assert.ok(!validation2.HasErrors, validation2.ErrorList)
      })
    })
})
