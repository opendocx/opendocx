/* eslint-disable no-unused-vars, comma-dangle */
const { describe, it } = require('mocha')
const openDocx = require('../src/index')
const assert = require('assert')
const fs = require('fs')
// const XmlAssembler = require('../src/docx-evaluator')
const XmlAssembler = require('../src/indirect-assembler')
const testUtil = require('./test-utils')
const Scope = require('yatte').Scope

describe('Generating XML data for DOCX templates (white box)', function () {
  it('auto-generated js function should execute with an empty context', async function () {
    const templatePath = testUtil.GetTemplatePath('SimpleWill.docx')
    let jsFile = templatePath + '.js'
    // only re-compile if necessary -- should only happen if this test file is being run independently of others
    if (!fs.existsSync(jsFile)) {
      const result = await openDocx.compileDocx(templatePath)
      assert.strictEqual(result.HasErrors, false)
      assert.strictEqual(fs.existsSync(result.ExtractedLogic), true)
      assert.strictEqual(fs.existsSync(result.DocxGenTemplate), true)
      jsFile = result.ExtractedLogic
    }
    const str = new XmlAssembler({}).assembleXml(jsFile)
    assert.strictEqual(str, '<?xml version="1.0"?><_odx><C1>[Testator.Name]</C1><C3>[Testator.City]</C3><C4>[Testator.County]</C4><C5>[Testator.State]</C5><C6>[Representative.Name]</C6><C7>[Representative.City]</C7><C8>[Representative.County]</C8><C9>[Representative.State]</C9><C10>[Representative.Gender.HeShe]</C10><C12b>false</C12b><L18></L18><C27>[GoverningLaw]</C27><C29>[SigningDate]</C29><C33>[Testator.Gender.HimHer]</C33><C34>[Testator.Gender.HisHer]</C34><C37>[Witness1Name]</C37><C38>[Witness2Name]</C38><C39>[GoverningLaw]</C39><C40>[NotaryCounty]</C40></_odx>')
  })
  it('auto-generated js function should execute against its contextHelper with a populated context', async function () {
    const templatePath = testUtil.GetTemplatePath('SimpleWill.docx')
    let jsFile = templatePath + '.js'
    // only re-compile if necessary -- should only happen if this test file is being run independently of others
    if (!fs.existsSync(jsFile)) {
      const result = await openDocx.compileDocx(templatePath)
      assert.strictEqual(result.HasErrors, false)
      assert.strictEqual(fs.existsSync(result.ExtractedLogic), true)
      assert.strictEqual(fs.existsSync(result.DocxGenTemplate), true)
      jsFile = result.ExtractedLogic
    }
    const data = SimpleWillDemoContext
    // now evaluate the helper against this data context, to test its functionality
    const str = new XmlAssembler(data).assembleXml(jsFile)
    fs.writeFileSync(templatePath + '.asmdata.xml', str)
    assert.strictEqual(str,
      '<?xml version="1.0"?><_odx><C1>John Smith</C1><C3>Jonestown</C3><C4>Lebanon</C4><C5>Pennsylvania</C5><C6>Kim Johnston</C6><C7>Philadelphia</C7><C8>Philadelphia</C8><C9>Pennsylvania</C9><C10>she</C10><C12b>true</C12b><C13>Tina Turner</C13><C14>Los Angeles</C14><C15>Los Angeles</C15><C16>California</C16><L18><L18i><C19>1</C19><C20>st</C20><C21>Kelly Smith</C21><C22>1234 Anystreet, Allentown, PA</C22><C23>Daughter</C23><C24>5555</C24><C25>My cat.</C25><L18p/></L18i><L18i><C19>2</C19><C20>nd</C20><C21>John Smith Jr.</C21><C22>54321 Geronimo, Jonestown, PA</C22><C23>Son</C23><C24>4444</C24><C25>My house.</C25><L18p/></L18i><L18i><C19>3</C19><C20>rd</C20><C21>Diane Kennedy</C21><C22>Unknown</C22><C23>Mistress</C23><C24>[SSNLast4]</C24><C25>My misguided affection.</C25><L18p/></L18i><L18i><C19>4</C19><C20>th</C20><C21>Tim Billingsly</C21><C22>Boulder, CO</C22><C23>cat</C23><C24>[SSNLast4]</C24><C25>Everything else.</C25><L18p/></L18i></L18><C27>Pennsylvania</C27><C29>10th day of March, 2019</C29><C33>him</C33><C34>his</C34><C37>John Doe</C37><C38>Marilyn Monroe</C38><C39>PENNSYLVANIA</C39><C40>ALLEGHENY</C40></_odx>')
  })
  it('js function should not contain multiple definitions for the same data value', async function () {
    const templatePath = testUtil.GetTemplatePath('redundant_ifs.docx')
    let jsFile = templatePath + '.js'
    if (!fs.existsSync(jsFile)) {
      const result = await openDocx.compileDocx(templatePath, undefined, undefined, false)
      assert.strictEqual(result.HasErrors, false)
      assert.strictEqual(fs.existsSync(result.ExtractedLogic), true)
      assert.strictEqual(fs.existsSync(result.DocxGenTemplate), true)
      jsFile = result.ExtractedLogic
    }
    const data = { A: true, B: false }
    // now evaluate the helper against this data context, to test its functionality
    const str = new XmlAssembler(data).assembleXml(jsFile)
    fs.writeFileSync(templatePath + '.asmdata.xml', str)
    assert.strictEqual(str, '<?xml version="1.0"?><_odx><C1b>true</C1b><C5b>false</C5b></_odx>')
  })
  it('xml should include TF answers for content fields separate from if fields', async function () {
    const templatePath = testUtil.GetTemplatePath('Syntax.docx')
    let jsFile = templatePath + '.js'
    if (!fs.existsSync(jsFile)) {
      const result = await openDocx.compileDocx(templatePath, undefined, undefined, false)
      assert.strictEqual(result.HasErrors, false)
      assert.strictEqual(fs.existsSync(result.ExtractedLogic), true)
      assert.strictEqual(fs.existsSync(result.DocxGenTemplate), true)
      jsFile = result.ExtractedLogic
    }
    const data = { IsTaxPlanning: false }
    // now evaluate the helper against this data context, to test its functionality
    const str = new XmlAssembler(data).assembleXml(jsFile)
    fs.writeFileSync(templatePath + '.asmdata.xml', str)
    assert.strictEqual(str, '<?xml version="1.0"?><_odx><C1>false</C1><C1b>false</C1b></_odx>')
  })
  it('list testing', async function () {
    const templatePath = testUtil.GetTemplatePath('Lists.docx')
    const result = await openDocx.compileDocx(templatePath)
    assert.strictEqual(result.HasErrors, false)
    const jsFile = result.ExtractedLogic
    const compiledTemplate = result.DocxGenTemplate
    const data = BradyTestData
    // now evaluate the helper against this data context, to test its functionality
    const str = new XmlAssembler(data).assembleXml(jsFile)
    fs.writeFileSync(templatePath + '.asmdata.xml', str)
    // note: lists do not (currently) get optimized in the XML -- every time a template repeats through a list, another copy of the list is stored in the XML. This is because I haven't done the work yet to optimize that part.
    // it works well enough this way, but in the future (if the XML chunks are so big they're slowing something down) we can optimize it better.
    assert.strictEqual(str,
      '<?xml version="1.0"?><_odx><L1><L1i><C2>Greg</C2><L1p>, </L1p></L1i><L1i><C2>Marcia</C2><L1p>, </L1p></L1i><L1i><C2>Peter</C2><L1p>, </L1p></L1i><L1i><C2>Jan</C2><L1p>, </L1p></L1i><L1i><C2>Bobby</C2><L1p> and </L1p></L1i><L1i><C2>Cindy</C2><L1p/></L1i></L1><L4><L4i><C2>Greg</C2><C6>09/30/1954</C6><L4p>;</L4p></L4i><L4i><C2>Marcia</C2><C6>08/05/1956</C6><L4p>;</L4p></L4i><L4i><C2>Peter</C2><C6>11/07/1957</C6><L4p>;</L4p></L4i><L4i><C2>Jan</C2><C6>04/29/1958</C6><L4p>;</L4p></L4i><L4i><C2>Bobby</C2><C6>12/19/1960</C6><L4p>; and</L4p></L4i><L4i><C2>Cindy</C2><C6>08/14/1961</C6><L4p>.</L4p></L4i></L4></_odx>')
  })
  it('should assemble data XML that includes unanswered placeholders', async function () {
    const templatePath = testUtil.GetTemplatePath('SimpleWill2.docx')
    const result = await openDocx.compileDocx(templatePath, undefined, undefined, false)
    assert.strictEqual(result.HasErrors, false)
    const jsFile = result.ExtractedLogic
    // const compiledTemplate = result.DocxGenTemplate
    const data = {
      GoverningLaw: 'Utah',
      SigningDate: new Date(2019, 3, 26),
    }
    // now evaluate the helper against this data context, to test its functionality
    const str = new XmlAssembler(data).assembleXml(jsFile)
    fs.writeFileSync(templatePath + '.unans.asmdata.xml', str)
    assert.strictEqual(str,
      '<?xml version="1.0"?><_odx><C1>[Testator.Name]</C1><C3>[Testator.City]</C3><C4>[Testator.County]</C4><C5>[Testator.State]</C5><C6>[Representative.Name]</C6><C7>[Representative.City]</C7><C8>[Representative.County]</C8><C9>[Representative.State]</C9><C10>[Representative.Gender.HeShe]</C10><C12b>false</C12b><L18></L18><C27>Utah</C27><C29>26th day of April, 2019</C29><C33>[Testator.Gender.HimHer]</C33><C34>[Testator.Gender.HisHer]</C34><L37></L37><C41>UTAH</C41><C42>[NotaryCounty]</C42><L44></L44><C49>[WitnessNames[0]]</C49><L50></L50></_odx>')

    // let result = await openDocx.assembleDocx(templatePath, testUtil.FileNameAppend(templatePath, '-assembled'), data)
    // assert.strictEqual(result.HasErrors, false)
    // const validation = await templater.validateDocument({documentFile: result.Document})
    // assert.ok(!validation.HasErrors, validation.ErrorList)
  })
  it('should produce usable XML when an unconditional usage of a variable follows a conditional one', async function () {
    const templatePath = testUtil.GetTemplatePath('cond-uncond.docx')
    const result = await openDocx.compileDocx(templatePath, undefined, undefined, false)
    assert.strictEqual(result.HasErrors, false)
    const jsFile = result.ExtractedLogic
    // const compiledTemplate = result.DocxGenTemplate
    const data = {
      x: true,
      a: 'testing'
    }
    // now evaluate the helper against this data context, to test its functionality
    const str = new XmlAssembler(data).assembleXml(jsFile)
    assert.strictEqual(str, '<?xml version="1.0"?><_odx><C1b>true</C1b><C2>testing</C2></_odx>')
    fs.writeFileSync(templatePath + '.asmdata.xml', str)
    const asmResult = openDocx.assembleDocx(templatePath, templatePath + '-assembled.docx', data)
    assert(!asmResult.HasErrors)
  })
  it('should produce usable XML and a valid assembled document for a simple "if x then x" template', async function () {
    // making sure x is emitted only once, whether it is truthy or falsy, so we don't get XML errors
    const templatePath = testUtil.GetTemplatePath('self-cond.docx')
    const result = await openDocx.compileDocx(templatePath, undefined, undefined, false)
    assert.strictEqual(result.HasErrors, false)
    const jsFile = result.ExtractedLogic
    // const compiledTemplate = result.DocxGenTemplate
    const data = {
      x: 'testing'
    }
    // now evaluate the helper against this data context, to test its functionality
    let str = new XmlAssembler(data).assembleXml(jsFile)
    assert.strictEqual(str, '<?xml version="1.0"?><_odx><C2b>true</C2b><C2>testing</C2></_odx>')
    fs.writeFileSync(templatePath + '.asmdata1.xml', str)
    let asmResult = openDocx.assembleDocx(templatePath, templatePath + '-assembled1.docx', data)
    assert(!asmResult.HasErrors)
    // now evaluate the helper against NO data context, to test its functionality
    str = new XmlAssembler({}).assembleXml(jsFile)
    assert.strictEqual(str, '<?xml version="1.0"?><_odx><C2b>false</C2b></_odx>')
    fs.writeFileSync(templatePath + '.asmdata2.xml', str)
    asmResult = openDocx.assembleDocx(templatePath, templatePath + '-assembled2.docx', {})
    assert(!asmResult.HasErrors)
  })
  it('should create the expected XML for ifpoa.docx', async function () {
    const templatePath = testUtil.GetTemplatePath('ifpoa.docx')
    const result = await openDocx.compileDocx(templatePath, undefined, undefined, false)
    assert.strictEqual(result.HasErrors, false)
    const jsFile = result.ExtractedLogic
    // const compiledTemplate = result.DocxGenTemplate
    const data = { ClientName: 'John Doe', DPOAType: new String('Contingent') } // eslint-disable-line
    let str = new XmlAssembler(data).assembleXml(jsFile)
    assert.strictEqual(str, '<?xml version="1.0"?><_odx><C1>John Doe</C1><C3b>true</C3b><C4b>false</C4b></_odx>')
    fs.writeFileSync(templatePath + '.asmdata1.xml', str)
    let asmResult = openDocx.assembleDocx(templatePath, templatePath + '-assembled1.docx', data)
    assert(!asmResult.HasErrors)
    // now evaluate the helper against NO data context, to test its functionality
    str = new XmlAssembler({}).assembleXml(jsFile)
    assert.strictEqual(str, '<?xml version="1.0"?><_odx><C1>[ClientName]</C1><C3b>false</C3b><C4b>false</C4b></_odx>')
    fs.writeFileSync(templatePath + '.asmdata2.xml', str)
    asmResult = openDocx.assembleDocx(templatePath, templatePath + '-assembled2.docx', {})
    assert(!asmResult.HasErrors)
  })
  it('should create the expected XML for BeneficiaryList.docx', async function () {
    const templatePath = testUtil.GetTemplatePath('BeneficiaryList.docx')
    const result = await openDocx.compileDocx(templatePath, undefined, undefined, false)
    assert.strictEqual(result.HasErrors, false)
    const jsFile = result.ExtractedLogic
    // const compiledTemplate = result.DocxGenTemplate
    const data = {
      Beneficiaries: [
        { Name: 'Joe Bloggs' },
        { Name: 'Bob Syuruncle' },
        { Name: 'Joe Blow' },
        { Name: 'Astruas Bob' },
      ]
    }
    let str = new XmlAssembler(data).assembleXml(jsFile)
    const expectedXml = '<?xml version="1.0"?><_odx><L1><L1i><C2>Joe Bloggs</C2><L1p/></L1i></L1><L4><L4i><C2>Bob Syuruncle</C2><L4p/></L4i><L4i><C2>Joe Blow</C2><L4p/></L4i></L4><C7b>true</C7b><C8>Astruas Bob</C8></_odx>'
    assert.strictEqual(str, expectedXml)
    fs.writeFileSync(templatePath + '.asmdata1.xml', str)
    let asmResult = openDocx.assembleDocx(templatePath, templatePath + '-assembled1.docx', data)
    assert(!asmResult.HasErrors)
    // now evaluate again with data in locals, and something else in scope, and make sure it still works
    const otherData = Scope.pushObject(data, Scope.pushObject({ global: 'stuff' }))
    str = new XmlAssembler(otherData).assembleXml(jsFile)
    assert.strictEqual(str, expectedXml)
    fs.writeFileSync(templatePath + '.asmdata2.xml', str)
    asmResult = openDocx.assembleDocx(templatePath, templatePath + '-assembled2.docx', data)
    assert(!asmResult.HasErrors)
  })
})

const SimpleWillDemoContext = {
  Testator: {
    Name: 'John Smith',
    City: 'Jonestown',
    State: 'Pennsylvania',
    County: 'Lebanon',
    Gender: { Name: 'Male', HeShe: 'he', HimHer: 'him', HisHer: 'his', HisHers: 'his' }
  },
  GoverningLaw: 'Pennsylvania',
  SigningDate: new Date(2019, 2, 10),
  Witness1Name: 'John Doe',
  Witness2Name: 'Marilyn Monroe',
  NotaryCounty: 'Allegheny',
  NominateBackup: true,
  Representative: {
    Name: 'Kim Johnston',
    City: 'Philadelphia',
    State: 'Pennsylvania',
    County: 'Philadelphia',
    Gender: { Name: 'Female', HeShe: 'she', HimHer: 'her', HisHer: 'her', HisHers: 'hers' }
  },
  BackupRepresentative: {
    Name: 'Tina Turner',
    City: 'Los Angeles',
    State: 'California',
    County: 'Los Angeles',
    Gender: { Name: 'Female', HeShe: 'she', HimHer: 'her', HisHer: 'her', HisHers: 'hers' }
  },
  Beneficiaries: [
    {
      Name: 'Kelly Smith',
      Address: '1234 Anystreet, Allentown, PA',
      Relationship: 'Daughter',
      SSNLast4: '5555',
      PropertyBequeath: 'My cat.'
    },
    {
      Name: 'John Smith Jr.',
      Address: '54321 Geronimo, Jonestown, PA',
      Relationship: 'Son',
      SSNLast4: '4444',
      PropertyBequeath: 'My house.'
    },
    {
      Name: 'Diane Kennedy',
      Address: 'Unknown',
      Relationship: 'Mistress',
      PropertyBequeath: 'My misguided affection.'
    },
    {
      Name: 'Tim Billingsly',
      Address: 'Boulder, CO',
      Relationship: 'cat',
      PropertyBequeath: 'Everything else.'
    },
  ],
}

const BradyTestData = {
  Children: [
    {
      Name: 'Greg',
      Birthdate: new Date(1954, 8, 30)
    },
    {
      Name: 'Marcia',
      Birthdate: new Date(1956, 7, 5)
    },
    {
      Name: 'Peter',
      Birthdate: new Date(1957, 10, 7)
    },
    {
      Name: 'Jan',
      Birthdate: new Date(1958, 3, 29)
    },
    {
      Name: 'Bobby',
      Birthdate: new Date(1960, 11, 19)
    },
    {
      Name: 'Cindy',
      Birthdate: new Date(1961, 7, 14)
    }
  ]
}
