/* eslint-disable no-unused-vars, comma-dangle, object-curly-newline, object-property-newline */
const { describe, it } = require('mocha')
const openDocx = require('../src/index')
const templater = require('../src/docx-templater')
const assert = require('assert')
const testUtil = require('./test-utils')
const { assembleText, compileText, Scope, IndirectVirtual } = require('yatte')
const fs = require('fs')

describe('Assembling documents from DOCX templates', function () {
  const tests = [
    { template: 'SimpleWill.docx', data: 'SimpleWillTestData.js' },
    { template: 'SimpleWill2.docx', data: 'SimpleWillTestData.js', saveXml: true },
    { template: 'Lists.docx', data: 'BradyTestData.js', compileFirst: true },
    { template: '2lists.docx', data: 'BradyTestData.js', compileFirst: true },
    { template: '2listsfilter.docx', data: 'BradyTestData.js', compileFirst: true, saveXml: true },
    {
      template: 'TestNest2.docx', compileFirst: true,
      data: { A: 'Hello', B: 'mother', B2: 'mother-in-law', C: 'father', D: 'camp', E: 'Grenada',
        F: 'entertaining', G: 'fun', H: 'raining', x: false, y: 1,
        outer: [{ z: true, C: 'candy' }, { z: false, B2: 'brother', inner: [{ C: 'Ted' }, { C: 'Gump' }] }],
        inner: [{ C: 'clamp' }, { C: 'corrigible' }, { C: 'corrupt' }]
      },
    },
    {
      template: 'LetterSimplified.docx', compileFirst: true,
      data: { EngagementDate: '5 Jan 2019', LawFirm: 'Baker & Bleek', ClientFullName: 'John Jacob Jingleheimer Smith',
        SpouseFullName: 'Jackie Janice Jingleheimer', Fee: '500.00', DeedFee: '50.00', ClientState: 'California',
      },
    },
    { template: 'list_punc_fmt.docx', data: { L: ['one', 'two', 'three'] }, compileFirst: true },
    { template: 'quote1.docx', data: { D: { T: 'Children\'s Trust' } }, compileFirst: true },
    { template: 'whitespace.docx', data: { whitespace: '                  ', nobreak: '                  ' },
      compileFirst: true, saveXml: true },
    { template: 'notext.docx', data: {},
      compileFirst: true, saveXml: true },
  ]

  tests.forEach(({ template, data, compileFirst, saveXml, description }) => {
    it(description || `should assemble (without errors) a document based on ${template}`, async function () {
      const templatePath = testUtil.GetTemplatePath(template)
      if (compileFirst) {
        await openDocx.compileDocx(templatePath)
      }
      if (typeof data === 'string') {
        data = require('./templates/' + data)
      }
      // now assemble the document against this data context
      const outFile = testUtil.FileNameAppend(templatePath, '-assembled')
      const result = await openDocx.assembleDocx(templatePath, outFile, data, null,
        saveXml ? (outFile + '.xml') : undefined)
      assert.strictEqual(result.HasErrors, false, result.Errors)
      // todo: figure out how best to look in the file and make sure the text is right :-)
      const validation = await templater.validateDocument({ documentFile: result.Document })
      assert.ok(!validation.HasErrors, validation.ErrorList)
    })
  })

  it('should assemble (correctly) the inserttest.docx template', async function () {
    const insertStub = (scope) => {
      return new IndirectVirtual({ name: 'inserted.docx' }, scope, 'docx')
    }
    insertStub.logic = true
    const templatePath = testUtil.GetTemplatePath('inserttest.docx')
    const evaluator = await openDocx.compileDocx(templatePath)
    const data = {
      Name: 'John',
      Insert: insertStub,
    }
    const scope = Scope.pushObject(data)
    const result = await openDocx.assembleDocx(templatePath, testUtil.FileNameAppend(templatePath, '-assembled'),
      scope, async obj => testUtil.GetTemplatePath(obj.name),
      templatePath + '-asmdata.xml')
    assert.strictEqual(result.HasErrors, false)
    const validation = await templater.validateDocument({ documentFile: result.Document })
    assert.ok(!validation.HasErrors, validation.ErrorList)
  })

  it('should assemble (correctly) the inserttest3.docx template', async function () {
    const insertStub = (scope) => {
      return new IndirectVirtual({ name: 'inserted3.docx' }, scope, 'docx')
    }
    insertStub.logic = true
    const templatePath = testUtil.GetTemplatePath('inserttest3.docx')
    const evaluator = await openDocx.compileDocx(templatePath)
    const data = {
      Name: 'John',
      Insert: insertStub,
    }
    const scope = Scope.pushObject(data)
    const result = await openDocx.assembleDocx(templatePath, testUtil.FileNameAppend(templatePath, '-assembled'),
      scope, async obj => testUtil.GetTemplatePath(obj.name),
      templatePath + '-asmdata.xml')
    assert.strictEqual(result.HasErrors, false)
    const validation = await templater.validateDocument({ documentFile: result.Document })
    assert.ok(!validation.HasErrors, validation.ErrorList)
  })

  it('inserttest4.docx: multiple insert of same file assembles only once', async function () {
    const insertStub = (scope) => {
      return new IndirectVirtual({ name: 'inserted3.docx' }, scope, 'docx')
    }
    insertStub.logic = true
    const templatePath = testUtil.GetTemplatePath('inserttest4.docx')
    const evaluator = await openDocx.compileDocx(templatePath)
    const data = {
      Name: 'John',
      Insert: insertStub,
      A: true,
      B: true,
    }
    const scope = Scope.pushObject(data)
    let count = 0
    const result = await openDocx.assembleDocx(
      templatePath,
      testUtil.FileNameAppend(templatePath, '-assembled'),
      scope,
      async obj => {
        count++
        return testUtil.GetTemplatePath(obj.name)
      },
      templatePath + '-asmdata.xml',
    )
    assert.strictEqual(result.HasErrors, false)
    assert.strictEqual(count, 1)
    const validation = await templater.validateDocument({ documentFile: result.Document })
    assert.ok(!validation.HasErrors, validation.ErrorList)
  })

  it('inserttest5.docx: multiple inserts in multiple lists', async function () {
    const signerProto = {
      Insert: (scope) => new IndirectVirtual({ name: 'inserted5.docx' }, scope, 'docx'),
    }
    signerProto.Insert.logic = true // insertStub.logic = true
    const makeObject = function (proto, obj) {
      return Object.assign(Object.create(proto), obj)
    }
    const data = {
      Var1: 'Top Level Info 1',
      Var2: 'Top Level Info 2',
      Var3: true,
      Signers: [
        makeObject(signerProto, { Name: 'John', Included: false }),
        makeObject(signerProto, { Name: 'Mary', Included: true }),
      ],
    }
    const templatePath = testUtil.GetTemplatePath('inserttest5.docx')
    const evaluator = await openDocx.compileDocx(templatePath)
    const scope = Scope.pushObject(data)
    let count = 0
    const result = await openDocx.assembleDocx(
      templatePath,
      testUtil.FileNameAppend(templatePath, '-assembled'),
      scope,
      async obj => {
        count++
        return testUtil.GetTemplatePath(obj.name)
      },
      templatePath + '-asmdata.xml',
    )
    assert.strictEqual(result.HasErrors, false)
    assert.strictEqual(count, 2) // one for John, and ONLY one (not two!) for Mary
    const validation = await templater.validateDocument({ documentFile: result.Document })
    assert.ok(!validation.HasErrors, validation.ErrorList)
  })

  it('should assemble (correctly) the MainInsertIndirect.docx template', async function () {
    const insertStub = (scope) => {
      return new IndirectVirtual({ name: 'conditional_margin.docx' }, scope, 'docx')
    }
    insertStub.logic = true
    const templatePath = testUtil.GetTemplatePath('MainInsertIndirect.docx')
    const evaluator = await openDocx.compileDocx(templatePath)
    const data = {
      Name: 'John',
      Indirect: insertStub,
      margin: '2.0',
    }
    const scope = Scope.pushObject(data)
    const result = await openDocx.assembleDocx(templatePath, testUtil.FileNameAppend(templatePath, '-assembled'),
      scope, async obj => testUtil.GetTemplatePath(obj.name),
      templatePath + '-asmdata.xml')
    assert.strictEqual(result.HasErrors, false)
    const validation = await templater.validateDocument({ documentFile: result.Document })
    assert.ok(!validation.HasErrors, validation.ErrorList)
  })

  it('should create markdown previews of docx for insertion into text', async function () {
    const iTemplatePath = testUtil.GetTemplatePath('inserted2.docx')
    const compiledInsertTemplate = await openDocx.compileDocx(iTemplatePath)
    const previewContent = await fs.promises.readFile(compiledInsertTemplate.Preview, { encoding: 'utf-8' })
    const data = {
      Name: 'John',
      Inserted: compileText(previewContent),
    }
    const scope = Scope.pushObject(data)
    const template = 'Document about **{[Name]}**:\n\n{[Inserted]}\n\n--{[Name]}'
    const result = assembleText(template, scope)
    assert.strictEqual(result.value,
      'Document about **John**:\n\nThis is an **inserted template**, *John*.\n\n--John')
  })

  it('should convert markdown to docx for inserting formatted text into parent docx', async function () {
    const insertStub = (scope) => {
      return new IndirectVirtual({ toString: () => 'A **hyperlink**: [Duck Duck Go](https://duckduckgo.com)' },
        scope, 'markdown')
    }
    insertStub.logic = true // is this needed??
    const templatePath = testUtil.GetTemplatePath('inserttest.docx')
    const evaluator = await openDocx.compileDocx(templatePath)
    const data = {
      Name: 'John',
      Insert: insertStub,
    }
    const scope = Scope.pushObject(data)
    const result = await openDocx.assembleDocx(templatePath, testUtil.FileNameAppend(templatePath, '-assembled2'),
      scope, async obj => testUtil.GetTemplatePath(obj.name),
      templatePath + '-asmdata2.xml')
    assert.strictEqual(result.HasErrors, false, result.Errors.join('\n'))
    // const validation = await templater.validateDocument({documentFile: result.Document})
    // assert.ok(!validation.HasErrors, validation.ErrorList)
  })
})
