const openDocx = require("../index");
const assert = require('assert');
const { TestHelperTypes } = require('yatte');

describe('Assemble DOCX templates', function() {
    it('should assemble a template', async function() {
        const template = "test/SimpleWill.docx";
        const compileResult = await openDocx.compileDocx(template);
        const data = SimpleWillDemoContext;
        // temporarily/experimental: simulate schema "smartening" to be performed by Knackly app engine, based on information in Types
        TestHelperTypes.estate_plan(data);
        // now assemble the document against this "smart" data context
        let result = await openDocx.assembleDocx(template, data, "test/SimpleWill-assembled.docx");
        assert.equal(result.HasErrors, false);
    });
    it('should assemble another one too', async function() {
        const template = "test/TestNest2.docx";
        const compileResult = await openDocx.compileDocx(template);
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
        let result = await openDocx.assembleDocx(template, data, "test/TestNest2-assembled.docx");
        assert.equal(result.HasErrors, false);
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

