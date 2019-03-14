const assert = require('assert');
const templater = require('../text-templater');
const evaluator = require('../text-evaluator');
//const types = require('./types-test');

describe('Assembling text templates', function() {
    it('should assemble a simple template', function() {
        const template = "Hello {[planet]}!";
        const compiled = templater.parseTemplate(template);
        const data = {planet: "World"};
        const result = evaluator.assembleText(data, compiled);
        assert.equal(result, "Hello World!");
    });
    it('should assemble the FullName template', async function() {
        const template = "{[First]} {[if Middle]}{[Middle]} {[endif]}{[Last]}{[if Suffix]} {[Suffix]}{[endif]}";
        const compiled = templater.parseTemplate(template);
        const data = {First: "John", Last: "Smith", Suffix: "Jr."};
        const result = evaluator.assembleText(data, compiled);
        assert.equal(result, "John Smith Jr.");
    });
    it('should assemble the if/endif template', async function() {
        const template = "{[if true]}A{[endif]}";
        const compiled = templater.parseTemplate(template);
        const data = {};
        const result = evaluator.assembleText(data, compiled);
        assert.equal(result, "A");
    });
    it('should assemble the if/else/endif template', async function() {
        const template = "{[if false]}A{[else]}B{[endif]}";
        const compiled = templater.parseTemplate(template);
        const data = {};
        const result = evaluator.assembleText(data, compiled);
        assert.equal(result, "B");
    });
    it('should assemble the if/elseif/endif template', async function() {
        const template = "{[if false]}A{[elseif true]}B{[endif]}";
        const compiled = templater.parseTemplate(template);
        const data = {};
        const result = evaluator.assembleText(data, compiled);
        assert.equal(result, "B");
    });
    it('should assemble the if/elseif/else/endif template', async function() {
        const template = "{[if false]}A{[elseif false]}B{[else]}C{[endif]}";
        const compiled = templater.parseTemplate(template);
        const data = {};
        const result = evaluator.assembleText(data, compiled);
        assert.equal(result, "C");
    });
    it('should assemble the oceans template', async function() {
        const template = "Oceans are:\n\n{[list Oceans]}\n * {[Name]} (Average depth {[AverageDepth]} m)\n{[endlist]}";
        const compiled = templater.parseTemplate(template);
        const data = {
            "Planet":"Earth",
            "Continents":["Africa","Asia","Europe","North America","South America","Antarctica","Australia/Oceania"],
            "Oceans":[
                {"Name":"Pacific","AverageDepth":3970},
                {"Name":"Atlantic","AverageDepth":3646},
                {"Name":"Indian","AverageDepth":3741},
                {"Name":"Southern","AverageDepth":3270},
                {"Name":"Arctic","AverageDepth":1205}
            ],
            "IsHome":true,
            "Lifeless":false
        };
        const result = evaluator.assembleText(data, compiled);
        assert.equal(result, "Oceans are:\n\n * Pacific (Average depth 3970 m)\n * Atlantic (Average depth 3646 m)\n * Indian (Average depth 3741 m)\n * Southern (Average depth 3270 m)\n * Arctic (Average depth 1205 m)\n");
    });
    it('should assemble a filtered list', async function() {
        const template = "Continents containing u:\n\n{[list Continents.WithU]}\n * {[.]}\n{[endlist]}";
        const compiled = templater.parseTemplate(template);
        const data = {
            "Planet":"Earth",
            "Continents":["Africa","Asia","Europe","North America","South America","Antarctica","Australia/Oceania"],
            "Oceans":[
                {"Name":"Pacific","AverageDepth":3970},
                {"Name":"Atlantic","AverageDepth":3646},
                {"Name":"Indian","AverageDepth":3741},
                {"Name":"Southern","AverageDepth":3270},
                {"Name":"Arctic","AverageDepth":1205}
            ],
            "IsHome":true,
            "Lifeless":false
        };
        Object.defineProperty(data.Continents, 'WithU', { get: function() { return this.filter(item => item.includes("u")) } });
        const result = evaluator.assembleText(data, compiled);
        assert.equal(result, "Continents containing u:\n\n * Europe\n * South America\n * Australia/Oceania\n");
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
