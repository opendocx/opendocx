/* eslint-disable no-unused-vars, comma-dangle, camelcase */
'use strict'

const { describe, it } = require('mocha')
const openDocx = require('../src/index')
const templater = require('../src/docx-templater')
const assert = require('assert')
const fs = require('fs')
const testUtil = require('./test-utils')

describe('Full logic trees for DOCX Templates (experimental, white box)', function () {
  const tests = [
    { template: 'TestNest.docx', expected: 'TestNest.logic.js' },
    { template: 'TestNest2.docx', expected: 'TestNest2.logic.js' },
    { template: 'redundant_if.docx', expected: 'redundant_if.logic.js', comment: 'should not include redundant expressions when it includes the same "if" field multiple times' },
  ]

  tests.forEach(({ template, expected, comment }) => {
    it(comment || `should produce the expected "logic tree" for ${template} and all its fields`, async function () {
      const templatePath = testUtil.GetTemplatePath(template)
      const compiled = await openDocx.compileDocx(templatePath, undefined, undefined, false) // suppresses cleanup of interim artifacts, and in fact produces extras such as this experimental AST
      assert(fs.existsSync(compiled.ExtractedLogicTree))
      let astLogic
      assert.doesNotThrow(() => {
        astLogic = JSON.parse(fs.readFileSync(compiled.ExtractedLogicTree, 'utf8'))
      })
      const expectedResult = require('./templates/' + expected)
      assert.deepStrictEqual(astLogic, expectedResult)
    })
  })
})

describe('Manipulating task panes in DOCX files', function () {
  const addtests = [
    { template: 'addins_none.docx', output: '_added', comment: 'should embed a task pane in a DOCX without one' },
    { template: 'addins_existing.docx', output: '_added', comment: 'should embed a task pane in a DOCX that already has a different one' },
    { template: 'addins_one.docx', output: '_updated', comment: 'should update a task pane in a DOCX that already has the same one' },
  ]
  addtests.forEach(({ template, output, comment }) => {
    it(comment, async function () {
      const filePath = testUtil.GetTemplatePath(template)
      const buffer = await fs.promises.readFile(filePath)
      const modBuffer = await openDocx.embedTaskPane(
        buffer,
        '{635BF0CD-42CC-4174-B8D2-6D375C9A759E}',
        'wa104380862',
        '1.1.0.0',
        'en-US',
        'OMEX',
        'right',
        true,
        350,
        1,
      )
      const outFilePath = testUtil.FileNameAppend(filePath, output)
      await fs.promises.writeFile(outFilePath, modBuffer)
      const validation = await templater.validateDocument({ documentFile: outFilePath })
      assert.ok(!validation.HasErrors, validation.ErrorList)
    })
  })

  const remtests = [
    { template: 'addins_one.docx', output: '_removed', comment: 'should remove a task pane from a DOCX that has the targeted addin' },
    { template: 'addins_multi.docx', output: '_removed', comment: 'should remove a task pane from a DOCX that has multiple addins' },
    { template: 'addins_none.docx', output: '_removed', comment: 'should not err when attempting to remove addin that is not present' },
  ]
  remtests.forEach(({ template, output, comment }) => {
    it(comment, async function () {
      const filePath = testUtil.GetTemplatePath(template)
      const buffer = await fs.promises.readFile(filePath)
      const modBuffer = await openDocx.removeTaskPane(
        buffer,
        '{635BF0CD-42CC-4174-B8D2-6D375C9A759E}',
      )
      const outFilePath = testUtil.FileNameAppend(filePath, output)
      await fs.promises.writeFile(outFilePath, modBuffer)
      const validation = await templater.validateDocument({ documentFile: outFilePath })
      assert.ok(!validation.HasErrors, validation.ErrorList)
    })
  })
})
