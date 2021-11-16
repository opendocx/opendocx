const openDocx = require('../src/index')
const templater = require('../src/docx-templater')
const assert = require('assert')
const testUtil = require('./test-utils')
const { assembleText, compileText, Scope, IndirectVirtual } = require('yatte')
const fs = require('fs')

describe('Assembling documents from DOCX templates', function() {
    it('should assemble (without errors) a document based on the SimpleWill.docx template', async function() {
        const templatePath = testUtil.GetTemplatePath('SimpleWill.docx');
        //const compileResult = await openDocx.compileDocx(templatePath);
        const data = SimpleWillDemoContext;
        // now assemble the document against this data context
        let result = await openDocx.assembleDocx(templatePath, testUtil.FileNameAppend(templatePath, '-assembled'), data);
        assert.equal(result.HasErrors, false);
        const validation = await templater.validateDocument({documentFile: result.Document});
        assert.ok(!validation.HasErrors, validation.ErrorList);
    });
    it('should assemble (without errors) a document based on the SimpleWill2.docx template', async function() {
        const templatePath = testUtil.GetTemplatePath('SimpleWill2.docx');
        //const compileResult = await openDocx.compileDocx(templatePath);
        const data = SimpleWillDemoContext;
        // now assemble the document against this data context
        let outFile = testUtil.FileNameAppend(templatePath, '-assembled')
        let result = await openDocx.assembleDocx(templatePath, outFile, data, null, outFile + '.xml');
        assert.equal(result.HasErrors, false);
        const validation = await templater.validateDocument({documentFile: result.Document});
        assert.ok(!validation.HasErrors, validation.ErrorList);
    });
    it('should assemble (without errors) a document based on the Lists.docx template', async function() {
        const templatePath = testUtil.GetTemplatePath('Lists.docx');
        const compileResult = await openDocx.compileDocx(templatePath);
        const data = BradyTestData;

        let result = await openDocx.assembleDocx(templatePath, testUtil.FileNameAppend(templatePath, '-assembled'), data);
        assert.equal(result.HasErrors, false);
        const validation = await templater.validateDocument({documentFile: result.Document});
        assert.ok(!validation.HasErrors, validation.ErrorList);
    });
    it('should assemble (without errors) a document based on the 2lists.docx template', async function() {
        const templatePath = testUtil.GetTemplatePath('2lists.docx');
        const compileResult = await openDocx.compileDocx(templatePath);
        const data = BradyTestData;

        let result = await openDocx.assembleDocx(templatePath, testUtil.FileNameAppend(templatePath, '-assembled'), data);
        assert.equal(result.HasErrors, false);
        const validation = await templater.validateDocument({documentFile: result.Document});
        // todo: figure out how to look in the file and make sure the text is right :-)
        assert.ok(!validation.HasErrors, validation.ErrorList);
    });
    it('should assemble (without errors) a document based on the 2listsfilter.docx template', async function() {
        const templatePath = testUtil.GetTemplatePath('2listsfilter.docx');
        const compileResult = await openDocx.compileDocx(templatePath);
        const data = BradyTestData;

        let result = await openDocx.assembleDocx(templatePath, testUtil.FileNameAppend(templatePath, '-assembled'), data, null, testUtil.FileNameAppend(templatePath, '-asmdata.xml'));
        assert.equal(result.HasErrors, false);
        const validation = await templater.validateDocument({documentFile: result.Document});
        // todo: figure out how to look in the file and make sure the text is right :-)
        assert.ok(!validation.HasErrors, validation.ErrorList);
    });
    it('should assemble (without errors) a document based on the TestNest2.docx template', async function() {
        const templatePath = testUtil.GetTemplatePath('TestNest2.docx');
        const compileResult = await openDocx.compileDocx(templatePath);
        const data = {
            'A': 'Hello',
            'B': 'mother',
            'B2': 'mother-in-law',
            'C': 'father',
            'D': 'camp',
            'E': 'Grenada',
            'F': 'entertaining',
            'G': 'fun',
            'H': 'raining',
            'x': false,
            'y': 1,
            'outer': [{z: true, C:'candy'},{z: false, B2:'brother',inner:[{C:'Ted'},{C:'Gump'}]}],
            'inner': [{C: 'clamp'},{C: 'corrigible'},{C:'corrupt'}]
        };
        let result = await openDocx.assembleDocx(templatePath, testUtil.FileNameAppend(templatePath, '-assembled'), data);
        assert.equal(result.HasErrors, false);
        const validation = await templater.validateDocument({documentFile: result.Document});
        assert.ok(!validation.HasErrors, validation.ErrorList);
    })
    it('should assemble (without errors) a document based on the EngagementLetterSimplified.docx template', async function() {
        const templatePath = testUtil.GetTemplatePath('LetterSimplified.docx');
        const evaluator = await openDocx.compileDocx(templatePath);
        const data = {
            'EngagementDate': '5 Jan 2019',
            'LawFirm': 'Baker & Bleek',
            'ClientFullName': 'John Jacob Jingleheimer Smith',
            'SpouseFullName': 'Jackie Janice Jingleheimer',
            'Fee': '500.00',
            'DeedFee': '50.00',
            'ClientState': 'California',
        };
        let result = await openDocx.assembleDocx(templatePath, testUtil.FileNameAppend(templatePath, '-assembled'), data);
        assert.equal(result.HasErrors, false);
        const validation = await templater.validateDocument({documentFile: result.Document});
        assert.ok(!validation.HasErrors, validation.ErrorList);
    })
    it('should assemble (without errors) a document based on the list_punc_fmt.docx template', async function() {
        const templatePath = testUtil.GetTemplatePath('list_punc_fmt.docx');
        const evaluator = await openDocx.compileDocx(templatePath);
        const data = {
            'L': [ 'one', 'two', 'three' ],
        };
        let result = await openDocx.assembleDocx(templatePath, testUtil.FileNameAppend(templatePath, '-assembled'), data);
        assert.equal(result.HasErrors, false);
        const validation = await templater.validateDocument({documentFile: result.Document});
        assert.ok(!validation.HasErrors, validation.ErrorList);
    })
    it('should assemble (without errors) a document based on the quote1.docx template', async function() {
        const templatePath = testUtil.GetTemplatePath('quote1.docx');
        const evaluator = await openDocx.compileDocx(templatePath);
        const data = {
            D: {
                T: "Children's Trust"
            }
        }
        let result = await openDocx.assembleDocx(templatePath, testUtil.FileNameAppend(templatePath, '-assembled'), data);
        assert.equal(result.HasErrors, false);
        const validation = await templater.validateDocument({documentFile: result.Document});
        assert.ok(!validation.HasErrors, validation.ErrorList);
    })
    it('should assemble (correctly) the whitespace.docx template', async function() {
        const templatePath = testUtil.GetTemplatePath('whitespace.docx');
        const evaluator = await openDocx.compileDocx(templatePath);
        const data = {
            whitespace: "                  ",
            nobreak:    "                  ",
        }
        let result = await openDocx.assembleDocx(templatePath, testUtil.FileNameAppend(templatePath, '-assembled'),
            data, null, testUtil.FileNameAppend(templatePath, '-asmdata.xml'));
        assert.equal(result.HasErrors, false);
        const validation = await templater.validateDocument({documentFile: result.Document});
        assert.ok(!validation.HasErrors, validation.ErrorList);
    })
    it('should assemble (correctly) the inserttest.docx template', async function() {
        const insertStub = (scope) => {
            return new IndirectVirtual({ name: 'inserted.docx' }, scope, 'docx')
        }
        insertStub.logic = true
        const templatePath = testUtil.GetTemplatePath('inserttest.docx');
        const evaluator = await openDocx.compileDocx(templatePath);
        const data = {
            Name: "John",
            Insert: insertStub,
        }
        const scope = Scope.pushObject(data)
        let result = await openDocx.assembleDocx(templatePath, testUtil.FileNameAppend(templatePath, '-assembled'),
            scope, async obj => testUtil.GetTemplatePath(obj.name),
            testUtil.FileNameAppend(templatePath, '-asmdata.xml'));
        assert.equal(result.HasErrors, false);
        const validation = await templater.validateDocument({documentFile: result.Document});
        assert.ok(!validation.HasErrors, validation.ErrorList);
    })
    it('should assemble (correctly) the inserttest3.docx template', async function() {
        const insertStub = (scope) => {
            return new IndirectVirtual({ name: 'inserted3.docx' }, scope, 'docx')
        }
        insertStub.logic = true
        const templatePath = testUtil.GetTemplatePath('inserttest3.docx');
        const evaluator = await openDocx.compileDocx(templatePath);
        const data = {
            Name: "John",
            Insert: insertStub,
        }
        const scope = Scope.pushObject(data)
        let result = await openDocx.assembleDocx(templatePath, testUtil.FileNameAppend(templatePath, '-assembled'),
            scope, async obj => testUtil.GetTemplatePath(obj.name),
            testUtil.FileNameAppend(templatePath, '-asmdata.xml'));
        assert.equal(result.HasErrors, false);
        const validation = await templater.validateDocument({documentFile: result.Document});
        assert.ok(!validation.HasErrors, validation.ErrorList);
    })
    it('should create markdown previews of docx for insertion into text', async function () {
        const iTemplatePath = testUtil.GetTemplatePath('inserted2.docx');
        const compiledInsertTemplate = await openDocx.compileDocx(iTemplatePath);
        let previewContent = await fs.promises.readFile(compiledInsertTemplate.Preview, { encoding: 'utf-8' })
        const data = {
          Name: "John",
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
        const templatePath = testUtil.GetTemplatePath('inserttest.docx');
        const evaluator = await openDocx.compileDocx(templatePath);
        const data = {
            Name: "John",
            Insert: insertStub,
        }
        const scope = Scope.pushObject(data)
        let result = await openDocx.assembleDocx(templatePath, testUtil.FileNameAppend(templatePath, '-assembled2'),
            scope, async obj => testUtil.GetTemplatePath(obj.name),
            testUtil.FileNameAppend(templatePath, '-asmdata2.xml'));
        assert.strictEqual(result.HasErrors, false, result.Errors.join('\n'));
        // const validation = await templater.validateDocument({documentFile: result.Document});
        // assert.ok(!validation.HasErrors, validation.ErrorList);
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
    WitnessNames: [ "Jürgen Kemper", "Marlene Dietrich", "Hedy Lamar" ],
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
    Date,
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