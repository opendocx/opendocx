/* eslint-disable no-unused-vars */
const { describe, it } = require('mocha')
const opendocx = require('../src/index')
const assert = require('assert')
const fs = require('fs')
const testUtil = require('./test-utils')

describe('Producing files necessary for .NET Unit Tests to run', function () {
  const cases = [
    { template: 'SimpleWill.docx' },
    { template: 'nested.docx' },
    { template: 'redundant_ifs.docx' },
    { template: 'team_report.docx' },
    { template: 'abconditional.docx' },
    { template: 'Lists.docx' },
    { template: 'syntax_crash.docx' },
    { template: 'Syntax.docx' },
    { template: 'acp.docx' },
    { template: 'ifpoa.docx' },
    { template: 'loandoc_example.docx' },
    { template: 'list_punc_fmt.docx' },
    { template: 'simple-short.docx' },
    { template: 'StrayCC.docx' },
    { template: 'NestedFieldWeird.docx' },
    { template: 'DA270-ConditionalBookmark.docx' },
    { template: 'DA271-ConditionalBookmark.docx' },
    { template: 'DA272-InlineConditionalBookmark.docx' },
    { template: 'DA273-InlineConditionalBookmark.docx' },
    { template: 'notext.docx' }
  ]
  cases
    .forEach(({ template }) => {
      it('generates files for ' + template, async function () {
        this.slow(500)
        const templatePath = testUtil.GetTemplateNetPath(template)
        const result = await opendocx.compileDocx(templatePath, undefined, undefined, false)
        assert.strictEqual(fs.existsSync(result.ExtractedLogic), true)
      })
    })

  it('generates valid field JSON for MultiLineField.docx', async function () {
    const templatePath = testUtil.GetTemplateNetPath('MultiLineField.docx')
    const result = await opendocx.compileDocx(templatePath, undefined, undefined, false)
    assert.strictEqual(fs.existsSync(result.ExtractedLogic), true)
    // assert.doesNotThrow(() => {
    //     const extractedFieldJson = fs.readFileSync(result.ExtractedFields, 'utf8')
    //     const fieldList = JSON.parse(extractedFieldJson)
    // })
  })

  it('generates files for custom_props.docx', async function () {
    const templatePath = testUtil.GetTemplateNetPath('custom_props.docx')
    const result = await opendocx.compileDocx(templatePath, true, ['UpdateFields'], false)
    assert.strictEqual(fs.existsSync(result.ExtractedLogic), true)
  })

  // expected rejections...

  const rejectionCases = [
    { template: 'MissingEndIfPara.docx', message: 'Field 1\'s If has no matching EndIf' },
    { template: 'MissingEndIfRun.docx', message: 'Field 1\'s If has no matching EndIf' },
    { template: 'MissingIfRun.docx', message: 'Field 2\'s EndIf has no matching If' },
    { template: 'MissingIfPara.docx', message: 'Field 2\'s EndIf has no matching If' },
    { template: 'NonBlockIf.docx', message: 'Field 1\'s If has no matching EndIf' },
    { template: 'NonBlockEndIf.docx', message: 'Field 3\'s EndIf has no matching If' },
    { template: 'kMANT.docx', message: 'Field 3\'s EndIf has no matching If' },
    { template: 'Married RLT Plain.docx', message: 'Field 223\'s Else has no matching If' }
  ]
  rejectionCases
    .forEach(({ template, message }) => {
      it('throws error for ' + template, async function () {
        assert.rejects(async () => {
          const templatePath = testUtil.GetTemplateNetPath(template)
          const result = await opendocx.compileDocx(templatePath, undefined, undefined, false)
          assert.strictEqual(fs.existsSync(result.ExtractedLogic), true)
        }, new Error(message))
      })
    })

  it('throws syntax error for crasher.docx', async function () {
    assert.rejects(async () => {
      const templatePath = testUtil.GetTemplateNetPath('crasher.docx')
      const result = await opendocx.compileDocx(templatePath, undefined, undefined, false)
      // assert.strictEqual(fs.existsSync(result.ExtractedLogic), true)
    }, new SyntaxError(
      'Syntax Error: \'"1, 2, and 3"\' is not a valid identifier:\n' +
      'Children|"1, 2, and 3"\n' +
      '         ^^^^^^^^^^^^^' +
      ' [in field 18]'))
  })

  const rejectionCases2 = [
    { template: 'fieldmatch-cc-err.docx', message: 'Field 1\'s If has no matching EndIf' },
    { template: 'fieldmatch-cc-err2.docx', message: 'Field 3\'s EndIf has no matching If' },
    { template: 'fieldmatch-cc-err3.docx', message: 'Field 1\'s If has no matching EndIf' },
    { template: 'fieldmatch-text-err.docx', message: 'Field 1\'s If has no matching EndIf' },
    { template: 'fieldmatch-text-err2.docx', message: 'Field 3\'s EndIf has no matching If' },
    { template: 'fieldmatch-text-err3.docx', message: 'Field 1\'s If has no matching EndIf' },
    { template: 'header-footer-cc-err.docx', message: 'Field 5\'s If has no matching EndIf' },
    { template: 'header-footer-text-err.docx', message: 'Field 5\'s If has no matching EndIf' }
  ]
  rejectionCases2
    .forEach(({ template, message }) => {
      it('throws when compiling ' + template, async function () {
        assert.rejects(async () => {
          const templatePath = testUtil.GetTemplatePath(template)
          await opendocx.compileDocx(templatePath, undefined, undefined, false) // suppress cleanup of interim artifacts during compilation
        }, new Error(message))
      })
    })
})
