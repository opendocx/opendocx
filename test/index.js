const openDocx = require("../index");
var assert = require('assert');

describe('Assembling text templates', function() {
    it('should assemble a simple template', async function() {
        const template = "Hello {[planet]}!";
        const data = {planet: "World"};
        const result = await openDocx.assembleDocument(template, data);
        assert.equal(result, "Hello World!");
    });
    it('should assemble the FullName template', async function() {
        const template = "{[First]} {[if Middle]}{[Middle]} {[endif]}{[Last]}{[if Suffix]} {[Suffix]}{[endif]}";
        const data = {First: "John", Last: "Smith", Suffix: "Jr."};
        const result = await openDocx.assembleDocument(template, data);
        assert.equal(result, "John Smith Jr.");
    });
    it('should assemble the if/endif template', async function() {
        const template = "{[if true]}A{[endif]}";
        const data = {};
        const result = await openDocx.assembleDocument(template, data);
        assert.equal(result, "A");
    });
    it('should assemble the if/else/endif template', async function() {
        const template = "{[if false]}A{[else]}B{[endif]}";
        const data = {};
        const result = await openDocx.assembleDocument(template, data);
        assert.equal(result, "B");
    });
    it('should assemble the if/elseif/endif template', async function() {
        const template = "{[if false]}A{[elseif true]}B{[endif]}";
        const data = {};
        const result = await openDocx.assembleDocument(template, data);
        assert.equal(result, "B");
    });
    it('should assemble the if/elseif/else/endif template', async function() {
        const template = "{[if false]}A{[elseif false]}B{[else]}C{[endif]}";
        const data = {};
        const result = await openDocx.assembleDocument(template, data);
        assert.equal(result, "C");
    });
    it('should assemble the oceans template', async function() {
        const template = "Oceans are:\n\n{[list Oceans]}\n * {[Name]} (Average depth {[AverageDepth]} m)\n{[endlist]}";
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
        const result = await openDocx.assembleDocument(template, data);
        assert.equal(result, "Oceans are:\n\n * Pacific (Average depth 3970 m)\n * Atlantic (Average depth 3646 m)\n * Indian (Average depth 3741 m)\n * Southern (Average depth 3270 m)\n * Arctic (Average depth 1205 m)\n");
    });
})
