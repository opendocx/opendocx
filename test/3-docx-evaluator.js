const openDocx = require("../src/index");
const assert = require('assert');
const fs = require('fs');
const XmlAssembler = require('../src/docx-evaluator');
const testUtil = require('./test-utils');

describe('Generating XML data for DOCX templates (white box)', function() {
    it('auto-generated js function should execute with an empty context', async function() {
        const templatePath = testUtil.GetTemplatePath('SimpleWill.docx');
        let jsFile = templatePath + '.js';
        // only re-compile if necessary -- should only happen if this test file is being run independently of others
        if (!fs.existsSync(jsFile)) {
            const result = await openDocx.compileDocx(templatePath);
            assert.equal(result.HasErrors, false);
            assert.equal(fs.existsSync(result.ExtractedLogic), true);
            assert.equal(fs.existsSync(result.DocxGenTemplate), true);
            jsFile = result.ExtractedLogic;
        }
        const str = new XmlAssembler({}).assembleXml(jsFile);
        assert.equal(str, '<?xml version="1.0"?><_odx><a>[Testator.Name]</a><b>[Testator.City]</b><c>[Testator.County]</c><d>[Testator.State]</d><e>[Representative.Name]</e><f>[Representative.City]</f><g>[Representative.County]</g><h>[Representative.State]</h><i>[Representative.Gender.HeShe]</i><n2>false</n2><v></v><w>[GoverningLaw]</w><x>[SigningDate|format:&quot;Do [day of] MMMM, YYYY&quot;]</x><y>[Testator.Gender.HimHer]</y><z>[Testator.Gender.HisHer]</z><A>[Witness1Name]</A><B>[Witness2Name]</B><C>[GoverningLaw|upper]</C><D>[NotaryCounty|upper]</D></_odx>');
    });
    it('auto-generated js function should execute against its contextHelper with a populated context', async function() {
        const templatePath = testUtil.GetTemplatePath('SimpleWill.docx');
        let jsFile = templatePath + '.js';
        // only re-compile if necessary -- should only happen if this test file is being run independently of others
        if (!fs.existsSync(jsFile)) {
            const result = await openDocx.compileDocx(templatePath);
            assert.equal(result.HasErrors, false);
            assert.equal(fs.existsSync(result.ExtractedLogic), true);
            assert.equal(fs.existsSync(result.DocxGenTemplate), true);
            jsFile = result.ExtractedLogic;
        }
        const data = SimpleWillDemoContext;
        // now evaluate the helper against this data context, to test its functionality
        const str = new XmlAssembler(data).assembleXml(jsFile);
        fs.writeFileSync(templatePath + '.asmdata.xml', str);
        assert.equal(str,
            '<?xml version="1.0"?><_odx><a>John Smith</a><b>Jonestown</b><c>Lebanon</c><d>Pennsylvania</d><e>Kim Johnston</e><f>Philadelphia</f><g>Philadelphia</g><h>Pennsylvania</h><i>she</i><n2>true</n2><j>Tina Turner</j><k>Los Angeles</k><l>Los Angeles</l><m>California</m><v><v0><o>1</o><p>st</p><q>Kelly Smith</q><r>1234 Anystreet, Allentown, PA</r><s>Daughter</s><t>5555</t><u>My cat.</u><v1/></v0><v0><o>2</o><p>nd</p><q>John Smith Jr.</q><r>54321 Geronimo, Jonestown, PA</r><s>Son</s><t>4444</t><u>My house.</u><v1/></v0><v0><o>3</o><p>rd</p><q>Diane Kennedy</q><r>Unknown</r><s>Mistress</s><t>[SSNLast4]</t><u>My misguided affection.</u><v1/></v0><v0><o>4</o><p>th</p><q>Tim Billingsly</q><r>Boulder, CO</r><s>cat</s><t>[SSNLast4]</t><u>Everything else.</u><v1/></v0></v><w>Pennsylvania</w><x>10th day of March, 2019</x><y>him</y><z>his</z><A>John Doe</A><B>Marilyn Monroe</B><C>PENNSYLVANIA</C><D>ALLEGHENY</D></_odx>');
    });
    it('js function should not contain multiple definitions for the same data value', async function() {
        const templatePath = testUtil.GetTemplatePath('redundant_ifs.docx');
        let jsFile = templatePath + '.js';
        if (!fs.existsSync(jsFile)) {
            const result = await openDocx.compileDocx(templatePath, false);
            assert.equal(result.HasErrors, false);
            assert.equal(fs.existsSync(result.ExtractedLogic), true);
            assert.equal(fs.existsSync(result.DocxGenTemplate), true);
            jsFile = result.ExtractedLogic;
        }
        const data = {A: true, B: false};
        // now evaluate the helper against this data context, to test its functionality
        const str = new XmlAssembler(data).assembleXml(jsFile);
        fs.writeFileSync(templatePath + '.asmdata.xml', str);
        assert.equal(str,
            '<?xml version="1.0"?><_odx><a2>true</a2><b2>false</b2></_odx>');
    })
    it('xml should include TF answers for content fields separate from if fields', async function() {
        const templatePath = testUtil.GetTemplatePath('Syntax.docx');
        let jsFile = templatePath + '.js';
        if (!fs.existsSync(jsFile)) {
            const result = await openDocx.compileDocx(templatePath, false);
            assert.equal(result.HasErrors, false);
            assert.equal(fs.existsSync(result.ExtractedLogic), true);
            assert.equal(fs.existsSync(result.DocxGenTemplate), true);
            jsFile = result.ExtractedLogic;
        }
        const data = {IsTaxPlanning: false};
        // now evaluate the helper against this data context, to test its functionality
        const str = new XmlAssembler(data).assembleXml(jsFile);
        fs.writeFileSync(templatePath + '.asmdata.xml', str);
        assert.equal(str,
            '<?xml version="1.0"?><_odx><a>false</a><a2>false</a2></_odx>');
    })
    it('list testing', async function() {
        const templatePath = testUtil.GetTemplatePath('Lists.docx');
        const result = await openDocx.compileDocx(templatePath);
        assert.equal(result.HasErrors, false);
        const jsFile = result.ExtractedLogic;
        const compiledTemplate = result.DocxGenTemplate;
        const data = BradyTestData;
        // now evaluate the helper against this data context, to test its functionality
        const str = new XmlAssembler(data).assembleXml(jsFile);
        fs.writeFileSync(templatePath + '.asmdata.xml', str);
        // note: lists do not (currently) get optimized in the XML -- every time a template repeats through a list, another copy of the list is stored in the XML. This is because I haven't done the work yet to optimize that part.
        // it works well enough this way, but in the future (if the XML chunks are so big they're slowing something down) we can optimize it better.
        assert.equal(str,
            '<?xml version="1.0"?><_odx><b><b0><a>Greg</a><b1>, </b1></b0><b0><a>Marcia</a><b1>, </b1></b0><b0><a>Peter</a><b1>, </b1></b0><b0><a>Jan</a><b1>, </b1></b0><b0><a>Bobby</a><b1> and </b1></b0><b0><a>Cindy</a><b1/></b0></b><d><d0><a>Greg</a><c>09/30/1954</c><d1>;</d1></d0><d0><a>Marcia</a><c>08/05/1956</c><d1>;</d1></d0><d0><a>Peter</a><c>11/07/1957</c><d1>;</d1></d0><d0><a>Jan</a><c>04/29/1958</c><d1>;</d1></d0><d0><a>Bobby</a><c>12/19/1960</c><d1>; and</d1></d0><d0><a>Cindy</a><c>08/14/1961</c><d1>.</d1></d0></d></_odx>');
    });
    it('should assemble data XML that includes unanswered placeholders', async function() {
        const templatePath = testUtil.GetTemplatePath('SimpleWill2.docx');
        const result = await openDocx.compileDocx(templatePath, false);
        assert.equal(result.HasErrors, false);
        const jsFile = result.ExtractedLogic;
        //const compiledTemplate = result.DocxGenTemplate;
        const data = {
            GoverningLaw: "Utah",
            SigningDate: new Date(2019, 3, 26),
        };
        // now evaluate the helper against this data context, to test its functionality
        const str = new XmlAssembler(data).assembleXml(jsFile);
        fs.writeFileSync(templatePath + '.unans.asmdata.xml', str);
        assert.equal(str,
            '<?xml version="1.0"?><_odx><a>[Testator.Name]</a><b>[Testator.City]</b><c>[Testator.County]</c><d>[Testator.State]</d><e>[Representative.Name]</e><f>[Representative.City]</f><g>[Representative.County]</g><h>[Representative.State]</h><i>[Representative.Gender.HeShe]</i><n2>false</n2><v></v><w>Utah</w><x>26th day of April, 2019</x><y>[Testator.Gender.HimHer]</y><z>[Testator.Gender.HisHer]</z><B></B><C>UTAH</C><D>[NotaryCounty|upper]</D><E></E><F>[WitnessNames[0]]</F><H></H></_odx>');

        // let result = await openDocx.assembleDocx(templatePath, testUtil.FileNameAppend(templatePath, '-assembled'), data);
        // assert.equal(result.HasErrors, false);
        // const validation = await templater.validateDocument({documentFile: result.Document});
        // assert.ok(!validation.HasErrors, validation.ErrorList);
    })
    it('should produce usable XML when an unconditional usage of a variable follows a conditional one', async function() {
        const templatePath = testUtil.GetTemplatePath('cond-uncond.docx');
        const result = await openDocx.compileDocx(templatePath, false);
        assert.equal(result.HasErrors, false);
        const jsFile = result.ExtractedLogic;
        //const compiledTemplate = result.DocxGenTemplate;
        const data = {
            x: true,
            a: "testing"
        };
        // now evaluate the helper against this data context, to test its functionality
        const str = new XmlAssembler(data).assembleXml(jsFile);
        assert.equal(str,
            '<?xml version="1.0"?><_odx><b2>true</b2><a>testing</a></_odx>');
        fs.writeFileSync(templatePath + '.asmdata.xml', str);
        let asmResult = openDocx.assembleDocx(templatePath, templatePath + '-assembled.docx', data)
        assert(!asmResult.HasErrors)
    })
    it('should produce usable XML and a valid assembled document for a simple "if x then x" template', async function() {
        // making sure x is emitted only once, whether it is truthy or falsy, so we don't get XML errors
        const templatePath = testUtil.GetTemplatePath('self-cond.docx');
        const result = await openDocx.compileDocx(templatePath, false);
        assert.equal(result.HasErrors, false);
        const jsFile = result.ExtractedLogic;
        //const compiledTemplate = result.DocxGenTemplate;
        const data = {
            x: "testing"
        };
        // now evaluate the helper against this data context, to test its functionality
        let str = new XmlAssembler(data).assembleXml(jsFile);
        assert.equal(str,
            '<?xml version="1.0"?><_odx><a2>true</a2><a>testing</a></_odx>');
        fs.writeFileSync(templatePath + '.asmdata1.xml', str);
        let asmResult = openDocx.assembleDocx(templatePath, templatePath + '-assembled1.docx', data)
        assert(!asmResult.HasErrors)
        // now evaluate the helper against NO data context, to test its functionality
        str = new XmlAssembler({}).assembleXml(jsFile);
        assert.equal(str,
            '<?xml version="1.0"?><_odx><a2>false</a2></_odx>');
        fs.writeFileSync(templatePath + '.asmdata2.xml', str);
        asmResult = openDocx.assembleDocx(templatePath, templatePath + '-assembled2.docx', {})
        assert(!asmResult.HasErrors)
    })
    it('should create the expected XML for ifpoa.docx', async function() {
        const templatePath = testUtil.GetTemplatePath('ifpoa.docx');
        const result = await openDocx.compileDocx(templatePath, false);
        assert.equal(result.HasErrors, false);
        const jsFile = result.ExtractedLogic;
        //const compiledTemplate = result.DocxGenTemplate;
        let data = { ClientName: 'John Doe', DPOAType: new String('Contingent') }
        let str = new XmlAssembler(data).assembleXml(jsFile);
        assert.equal(str,
            '<?xml version="1.0"?><_odx><a>John Doe</a><c2>true</c2><b2>false</b2></_odx>');
        fs.writeFileSync(templatePath + '.asmdata1.xml', str);
        let asmResult = openDocx.assembleDocx(templatePath, templatePath + '-assembled1.docx', data)
        assert(!asmResult.HasErrors)
        // now evaluate the helper against NO data context, to test its functionality
        str = new XmlAssembler({}).assembleXml(jsFile);
        assert.equal(str,
            '<?xml version="1.0"?><_odx><a>[ClientName]</a><c2>false</c2><b2>false</b2></_odx>');
        fs.writeFileSync(templatePath + '.asmdata2.xml', str);
        asmResult = openDocx.assembleDocx(templatePath, templatePath + '-assembled2.docx', {})
        assert(!asmResult.HasErrors)
    })
})

const SimpleWillDemoContext = {
    Testator: {
        Name: "John Smith",
        City: "Jonestown",
        State: "Pennsylvania",
        County: "Lebanon",
        Gender: { Name: "Male", HeShe: "he", HimHer: "him", HisHer: "his", HisHers: "his" }
    },
    GoverningLaw: "Pennsylvania",
    SigningDate: new Date(2019, 2, 10),
    Witness1Name: "John Doe",
    Witness2Name: "Marilyn Monroe",
    NotaryCounty: "Allegheny",
    NominateBackup: true,
    Representative: {
        Name: "Kim Johnston",
        City: "Philadelphia",
        State: "Pennsylvania",
        County: "Philadelphia",
        Gender: { Name: "Female", HeShe: "she", HimHer: "her", HisHer: "her", HisHers: "hers" }
    },
    BackupRepresentative: {
        Name: "Tina Turner",
        City: "Los Angeles",
        State: "California",
        County: "Los Angeles",
        Gender: { Name: "Female", HeShe: "she", HimHer: "her", HisHer: "her", HisHers: "hers" }
    },
    Beneficiaries: [
        {
            Name: "Kelly Smith",
            Address: "1234 Anystreet, Allentown, PA",
            Relationship: "Daughter",
            SSNLast4: "5555",
            PropertyBequeath: "My cat."
        },
        {
            Name: "John Smith Jr.",
            Address: "54321 Geronimo, Jonestown, PA",
            Relationship: "Son",
            SSNLast4: "4444",
            PropertyBequeath: "My house."
        },
        {
            Name: "Diane Kennedy",
            Address: "Unknown",
            Relationship: "Mistress",
            PropertyBequeath: "My misguided affection."
        },
        {
            Name: "Tim Billingsly",
            Address: "Boulder, CO",
            Relationship: "cat",
            PropertyBequeath: "Everything else."
        },
    ],
};

const BradyTestData = {
    Children: [
        {
            Name:'Greg',
            Birthdate:new Date(1954, 8, 30)
        },
        {
            Name:'Marcia',
            Birthdate:new Date(1956, 7, 5)
        },
        {
            Name:'Peter',
            Birthdate:new Date(1957, 10, 7)
        },
        {
            Name:'Jan',
            Birthdate:new Date(1958, 3, 29)
        },
        {
            Name:'Bobby',
            Birthdate:new Date(1960, 11, 19)
        },
        {
            Name:'Cindy',
            Birthdate:new Date(1961, 7, 14)
        }
    ]
}