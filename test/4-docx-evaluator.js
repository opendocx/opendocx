const openDocx = require("../index");
const assert = require('assert');
const types = require('./types-test');

describe('Assemble DOCX templates', function() {
    it('should assemble a template that has been pre-processed', async function() {
        const template = "test/SimpleWill.docx";
        const data = SimpleWillDemoContext;
        // temporarily/experimental: simulate schema "smartening" to be performed by Knackly app engine, based on information in Types
        types.estate_plan(data);
        // now assemble the document against this "smart" data context
        let result = await openDocx.assembleDocx(template, data, "test/SimpleWill-assembled.docx");
        assert.equal(result.HasErrors, false);
    });
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

