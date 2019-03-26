const openDocx = require("../index");
const templater = require('../docx-templater');
const assert = require('assert');
const { TestHelperTypes } = require('yatte');
const testUtil = require('./test-utils');

describe('Assembling documents from DOCX templates', function() {
    it('should assemble (without errors) a document based on the SimpleWill.docx template', async function() {
        const templatePath = testUtil.GetTemplatePath('SimpleWill.docx');
        //const compileResult = await openDocx.compileDocx(templatePath);
        const data = SimpleWillDemoContext;
        // temporarily/experimental: simulate schema "smartening" to be performed by Knackly app engine, based on information in Types
        TestHelperTypes.estate_plan(data);
        // now assemble the document against this "smart" data context
        let result = await openDocx.assembleDocx(templatePath, data, testUtil.FileNameAppend(templatePath, '-assembled'));
        assert.equal(result.HasErrors, false);
        const validation = await templater.validateDocument({documentFile: result.Document});
        assert.ok(!validation.HasErrors, validation.ErrorList);
    });
    it('should assemble (without errors) a document based on the Lists.docx template', async function() {
        const templatePath = testUtil.GetTemplatePath('Lists.docx');
        const compileResult = await openDocx.compileDocx(templatePath);
        const data = {Children:[{Name:'Greg',Birthdate:'1954-09-30'},{Name:'Marcia',Birthdate:'1956-08-05'},{Name:'Peter',Birthdate:'1957-11-07'},{Name:'Jan',Birthdate:'1958-04-29'},{Name:'Bobby',Birthdate:'1960-12-19'},{Name:'Cindy',Birthdate:'1961-08-14'}]};
        // convert date strings into date objects
        TestHelperTypes._list_of(TestHelperTypes.child, data.Children);

        let result = await openDocx.assembleDocx(templatePath, data, testUtil.FileNameAppend(templatePath, '-assembled'));
        assert.equal(result.HasErrors, false);
        const validation = await templater.validateDocument({documentFile: result.Document});
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
        let result = await openDocx.assembleDocx(templatePath, data, testUtil.FileNameAppend(templatePath, '-assembled'));
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
            'ClientFirstName': 'John',
            'ClientMiddleName': 'Jacob',
            'ClientLastName': 'Smith',
            'SpouseFirstName': 'Jane',
            'SpouseMiddleName': 'Jackie',
            'SpouseLastName': 'Jingleheimer',
            'Fee': '500.00',
            'DeedFee': '50.00',
            'ClientState': 'California',
        };
        let result = await openDocx.assembleDocx(templatePath, data, testUtil.FileNameAppend(templatePath, '-assembled'));
        assert.equal(result.HasErrors, false);
        const validation = await templater.validateDocument({documentFile: result.Document});
        assert.ok(!validation.HasErrors, validation.ErrorList);
    })

})

const SimpleWillDemoContext = {
    Testator: {
        Name: "John Smith",
        City: "Jonestown",
        State: "Pennsylvania",
        County: "Lebanon",
        Gender: "Male"
    },
    GoverningLaw: "Pennsylvania",
    SigningDate: "2019-03-10",
    Witness1Name: "John Doe",
    Witness2Name: "Marilyn Monroe",
    NotaryCounty: "Allegheny",
    NominateBackup: true,
    Representative: {
        Name: "Kim Johnston",
        City: "Philadelphia",
        State: "Pennsylvania",
        County: "Philadelphia",
        Gender: "Female",
    },
    BackupRepresentative: {
        Name: "Tina Turner",
        City: "Los Angeles",
        State: "California",
        County: "Los Angeles",
        Gender: "Female",
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

