/* eslint-disable no-unused-vars, comma-dangle, camelcase */
'use strict'

const { describe, it } = require('mocha')
const openDocx = require('../src/index')
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
