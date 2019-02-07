const textTemplater = require("../text-templater");
const openDocx = require("../index");
var assert = require('assert');

describe('Parsing simple conditionals', function() {
    it('should parse the FullName template', async function() {
        const template = "{[First]} {[if Middle]}{[Middle]} {[endif]}{[Last]}{[if Suffix]} {[Suffix]}{[endif]}";
        const result = await textTemplater.prepareText({templateFile: template});
        result.sh
        assert.deepEqual(result, [
            {type: "Content", select: "First"},
            " ",
            {type: "Conditional",select: "Middle", contentArray: [{type: "Content", select: "Middle"}, " "]},
            {type: "Content", select: "Last"},
            {type: "Conditional", select: "Suffix", contentArray: [" ", {type: "Content", select: "Suffix"}]}
        ]);
    });
    it('should parse the if/endif template', async function() {
        const template = "{[if true]}A{[endif]}";
        const result = await textTemplater.prepareText({templateFile: template});
        assert.deepEqual(result, [
            {type: "Conditional", select: "true", contentArray: ["A"]},
        ]);
    });
    it('should parse the if/else/endif template', async function() {
        const template = "{[if false]}A{[else]}B{[endif]}";
        const result = await textTemplater.prepareText({templateFile: template});
        assert.deepEqual(result, [
            {type: "Conditional", select: "false", contentArray: [
                "A",
                {type: "Else", contentArray: ["B"]}
            ]},
        ]);
    });
    it('should parse the if/elseif/endif template', async function() {
        const template = "{[if false]}A{[elseif true]}B{[endif]}";
        const result = await textTemplater.prepareText({templateFile: template});
        assert.deepEqual(result, [
            {type: "Conditional", select: "false", contentArray: [
                "A",
                {type: "ElseConditional", select: "true", contentArray: ["B"]}
            ]},
        ]);
    });
    it('should parse the if/elseif/else/endif template', async function() {
        const template = "{[if false]}A{[elseif false]}B{[else]}C{[endif]}";
        const result = await textTemplater.prepareText({templateFile: template});
        assert.deepEqual(result, [
            {type: "Conditional", select: "false", contentArray: [
                "A",
                {type: "ElseConditional", select: "false", contentArray: [
                    "B",
                    {type: "Else", contentArray: ["C"]}
                ]}
            ]},
        ]);
    });
    it('should parse the if/elseif/elseif/else/endif template', async function() {
        const template = "{[if false]}A{[elseif false]}B{[elseif false]}C{[else]}D{[endif]}";
        const result = await textTemplater.prepareText({templateFile: template});
        assert.deepEqual(result, [
            {type: "Conditional", select: "false", contentArray: [
                "A",
                {type: "ElseConditional", select: "false", contentArray: [
                    "B",
                    {type: "ElseConditional", select: "false", contentArray: [
                        "C",
                        {type: "Else", contentArray: ["D"]}
                    ]}
                ]}
            ]},
        ]);
    });
    it('should reject the if/else/elseif/endif template', async function() {
        const template = "{[if false]}A{[else]}B{[elseif false]}C{[endif]}";
        try {
            const result = await textTemplater.prepareText({templateFile: template});
            assert.fail("expected error not thrown");
        } catch(err) {
            assert.equal(err, "ElseConditional cannot follow an Else");
        }
    });
    it('should reject the if/else/else/endif template', async function() {
        const template = "{[if false]}A{[else]}B{[else]}C{[endif]}";
        try {
            const result = await textTemplater.prepareText({templateFile: template});
            assert.fail("expected error not thrown");
        } catch(err) {
            assert.equal(err, "Else cannot follow an Else");
        }
    });
    it('should reject the if template (no endif)', async function() {
        const template = "{[if true]}A";
        try {
            const result = await textTemplater.prepareText({templateFile: template});
            assert.fail("expected error not thrown");
        } catch(err) {
            assert.equal(err, "EndConditional not found");
        }
    });
    it('should reject the if/else template (no endif)', async function() {
        const template = "{[if true]}A{[else]}B";
        try {
            const result = await textTemplater.prepareText({templateFile: template});
            assert.fail("expected error not thrown");
        } catch(err) {
            assert.equal(err, "EndConditional not found");
        }
    });
    it('should reject the if/endif/endif template', async function() {
        const template = "{[if true]}A{[endif]}{[endif]}";
        try {
            const result = await textTemplater.prepareText({templateFile: template});
            assert.fail("expected error not thrown");
        } catch(err) {
            assert.equal(err, "Unmatched EndConditional");
        }
    });
    it('should reject the if/endif/else template', async function() {
        const template = "{[if true]}A{[endif]}{[else]}B";
        try {
            const result = await textTemplater.prepareText({templateFile: template});
            assert.fail("expected error not thrown");
        } catch(err) {
            assert.equal(err, "Unmatched Else");
        }
    });
    it('should reject the if/endif/elseif template', async function() {
        const template = "{[if true]}A{[endif]}{[elseif false]}B";
        try {
            const result = await textTemplater.prepareText({templateFile: template});
            assert.fail("expected error not thrown");
        } catch(err) {
            assert.equal(err, "Unmatched ElseConditional");
        }
    });
})

describe('Parsing nested conditionals', function() {
    it('should parse the if/if/endif/elseif/if/endif/else/if/endif/endif template', async function() {
        const template = "{[if false]}{[if true]}A{[endif]}{[elseif false]}{[if true]}B{[endif]}{[else]}{[if true]}C{[endif]}{[endif]}";
        const result = await textTemplater.prepareText({templateFile: template});
        assert.deepEqual(result, [
            {type: "Conditional", select: "false", contentArray: [
                {type: "Conditional", select: "true", contentArray: ["A"]},
                {type: "ElseConditional", select: "false", contentArray: [
                    {type: "Conditional", select: "true", contentArray: ["B"]},
                    {type: "Else", contentArray: [
                        {type: "Conditional", select: "true", contentArray: ["C"]}
                    ]}
                ]}
            ]}
        ]);
    });
    it('should parse the if/if/elseif/else/endif/elseif/if/elseif/else/endif/else/if/elseif/else/endif/endif template', async function() {
        const template = "{[if false]}{[if false]}A{[elseif false]}B{[else]}C{[endif]}{[elseif false]}{[if true]}D{[elseif false]}E{[else]}F{[endif]}{[else]}{[if false]}G{[elseif false]}H{[else]}I{[endif]}{[endif]}";
        const result = await textTemplater.prepareText({templateFile: template});
        assert.deepEqual(result, [
            {type: "Conditional", select: "false", contentArray: [
                {type: "Conditional", select: "false", contentArray: [
                    "A",
                    {type: "ElseConditional", select: "false", contentArray: [
                        "B",
                        {type: "Else", contentArray: ["C"]}
                    ]}
                ]},
                {type: "ElseConditional", select: "false", contentArray: [
                    {type: "Conditional", select: "true", contentArray: [
                        "D",
                        {type: "ElseConditional", select: "false", contentArray: [
                            "E",
                            {type: "Else", contentArray: ["F"]}
                        ]}
                    ]},
                    {type: "Else", contentArray: [
                        {type: "Conditional", select: "false", contentArray: [
                            "G",
                            {type: "ElseConditional", select: "false", contentArray: [
                                "H",
                                {type: "Else", contentArray: ["I"]}
                            ]}
                        ]}
                    ]}
                ]}
            ]}
        ]);
    });
})

describe('Parsing lists and nested lists', function() {
    it('should parse the list/endlist template', async function() {
        const template = "{[list []]}{[.]}{[endlist]}";
        const result = await textTemplater.prepareText({templateFile: template});
        assert.deepEqual(result, [
            {type: "Repeat", select: "[]", contentArray: [
                {type: "Content", select: "."},
            ]}
        ]);
    });
    it('should parse the list/list/endlist/endlist template', async function() {
        const template = "{[list []]}A: {[list inner]}{[.]}{[endlist inner]}{[endlist []]}";
        const result = await textTemplater.prepareText({templateFile: template});
        assert.deepEqual(result, [
            {type: "Repeat", select: "[]", contentArray: [
                "A: ",
                {type: "Repeat", select: "inner", contentArray: [
                    {type: "Content", select: "."},
                ]}
            ]}
        ]);
    });
    it('should reject the list template (missing endlist)', async function() {
        const template = "{[list []]}A";
        try {
            const result = await textTemplater.prepareText({templateFile: template});
            assert.fail("expected error not thrown");
        } catch(err) {
            assert.equal(err, "EndRepeat not found");
        }
    });
    it('should reject the endlist template (missing list)', async function() {
        const template = "A{[endlist]}";
        try {
            const result = await textTemplater.prepareText({templateFile: template});
            assert.fail("expected error not thrown");
        } catch(err) {
            assert.equal(err, "Unmatched EndRepeat");
        }
    });
    it('should reject the list/list/endlist template (missing endlist)', async function() {
        const template = "{[list []]}A{[list inner}B{[endlist]}";
        try {
            const result = await textTemplater.prepareText({templateFile: template});
            assert.fail("expected error not thrown");
        } catch(err) {
            assert.equal(err, "EndRepeat not found");
        }
    });
    it('should (for now) reject the list/else/endlist template', async function() {
        const template = "{[list []]}{[.]}{[else]}None{[endlist]}";
        try {
            const result = await textTemplater.prepareText({templateFile: template});
            assert.fail("expected error not thrown");
        } catch(err) {
            assert.equal(err, "Else cannot be in a Repeat");
        }
    });
})

describe('Parsing nested conditionals and lists', function() {
    it('should parse the list/if/elseif/else/endif/endlist template', async function() {
        const template = "{[list []]}{[if false]}A{[elseif .]}{[.]}{[else]}C{[endif]}, {[endlist]}";
        const result = await textTemplater.prepareText({templateFile: template});
        assert.deepEqual(result, [
            {type: "Repeat", select: "[]", contentArray: [
                {type: "Conditional", select: "false", contentArray: [
                    "A",
                    {type: "ElseConditional", select: ".", contentArray: [
                        {type: "Content", select: "."},
                        {type: "Else", contentArray: ["C"]}
                    ]}
                ]},
                ", "
            ]}
        ]);
    });
    it('should parse the if/list/endlist/elseif/list/list/endlist/endlist/else/list/endlist/endif template', async function() {
        const template = "{[if false]}{[list []]}{[test]}{[endlist]}{[elseif false]}A{[list outer]}B{[list inner]}C{[endlist]}D{[endlist]}E{[else]}F{[list another]}G{[endlist]}H{[endif]}";
        const result = await textTemplater.prepareText({templateFile: template});
        assert.deepEqual(result, [
            {type: "Conditional", select: "false", contentArray: [
                {type: "Repeat", select: "[]", contentArray: [
                    {type: "Content", select: "test"},
                ]},
                {type: "ElseConditional", select: "false", contentArray: [
                    "A",
                    {type: "Repeat", select: "outer", contentArray: [
                        "B",
                        {type: "Repeat", select: "inner", contentArray: ["C"]},
                        "D",
                    ]},
                    "E",
                    {type: "Else", contentArray: [
                        "F",
                        {type: "Repeat", select: "another", contentArray: ["G"]},
                        "H",
                    ]}
                ]}
            ]}
        ]);
    });
    it('should reject the list/endlist/endif template', async function() {
        const template = "{[list []]}A{[endlist]}{[endif]}";
        try {
            const result = await textTemplater.prepareText({templateFile: template});
            assert.fail("expected error not thrown");
        } catch(err) {
            assert.equal(err, "Unmatched EndConditional");
        }
    });
    it('should reject the list/endif template', async function() {
        const template = "{[list []]}A{[endif]}";
        try {
            const result = await textTemplater.prepareText({templateFile: template});
            assert.fail("expected error not thrown");
        } catch(err) {
            assert.equal(err, "Unmatched EndConditional");
        }
    });
    it('should reject the list/endif/endlist template', async function() {
        const template = "{[list []]}A{[endif]}{[endlist]}";
        try {
            const result = await textTemplater.prepareText({templateFile: template});
            assert.fail("expected error not thrown");
        } catch(err) {
            assert.equal(err, "Unmatched EndConditional");
        }
    });
    it('should reject the list/elseif/endlist template', async function() {
        const template = "{[list []]}A{[elseif false]}{[endlist]}";
        try {
            const result = await textTemplater.prepareText({templateFile: template});
            assert.fail("expected error not thrown");
        } catch(err) {
            assert.equal(err, "ElseConditional cannot be in a Repeat");
        }
    });
    it('should reject the if/list/endif/endlist template', async function() {
        const template = "{[if true]}A{[list source]}B{[endif]}C{[endlist]}";
        try {
            const result = await textTemplater.prepareText({templateFile: template});
            assert.fail("expected error not thrown");
        } catch(err) {
            assert.equal(err, "Unmatched EndConditional");
        }
    });
    it('should reject the list/if/else/endlist/endif template', async function() {
        const template = "{[list source]}A{[if true]}B{[else]}C{[endlist]}{[endif]}";
        try {
            const result = await textTemplater.prepareText({templateFile: template});
            assert.fail("expected error not thrown");
        } catch(err) {
            assert.equal(err, "Unmatched EndRepeat");
        }
    });
    it('should (for now) reject the if/list/endlist/elseif/list/else/endlist/endif template', async function() {
        const template = "{[if false]}{[list source]}A{[endlist]}{[elseif true]}{[list second]}B{[else]}C{[endlist]}{[endif]}";
        try {
            const result = await textTemplater.prepareText({templateFile: template});
            assert.fail("expected error not thrown");
        } catch(err) {
            assert.equal(err, "Else cannot be in a Repeat");
        }
    });
})
