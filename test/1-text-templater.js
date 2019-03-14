const textTemplater = require("../text-templater");
var assert = require('assert');

describe('Parsing simple conditionals', function() {
    it('should parse the FullName template', async function() {
        const template = "{[First]} {[if Middle]}{[Middle]} {[endif]}{[Last]}{[if Suffix]} {[Suffix]}{[endif]}";
        const result = await textTemplater.parseTemplate(template);
        assert.deepEqual(result, [
            {type: "Content", expr: "First"},
            " ",
            {type: "If",expr: "Middle", contentArray: [{type: "Content", expr: "Middle"}, " "]},
            {type: "Content", expr: "Last"},
            {type: "If", expr: "Suffix", contentArray: [" ", {type: "Content", expr: "Suffix"}]}
        ]);
    });
    it('should parse the if/endif template', async function() {
        const template = "{[if true]}A{[endif]}";
        const result = await textTemplater.parseTemplate(template);
        assert.deepEqual(result, [
            {type: "If", expr: "true", contentArray: ["A"]},
        ]);
    });
    it('should parse the if/else/endif template', async function() {
        const template = "{[if false]}A{[else]}B{[endif]}";
        const result = await textTemplater.parseTemplate(template);
        assert.deepEqual(result, [
            {type: "If", expr: "false", contentArray: [
                "A",
                {type: "Else", contentArray: ["B"]}
            ]},
        ]);
    });
    it('should parse the if/elseif/endif template', async function() {
        const template = "{[if false]}A{[elseif true]}B{[endif]}";
        const result = await textTemplater.parseTemplate(template);
        assert.deepEqual(result, [
            {type: "If", expr: "false", contentArray: [
                "A",
                {type: "ElseIf", expr: "true", contentArray: ["B"]}
            ]},
        ]);
    });
    it('should parse the if/elseif/else/endif template', async function() {
        const template = "{[if false]}A{[elseif false]}B{[else]}C{[endif]}";
        const result = await textTemplater.parseTemplate(template);
        assert.deepEqual(result, [
            {type: "If", expr: "false", contentArray: [
                "A",
                {type: "ElseIf", expr: "false", contentArray: [
                    "B",
                    {type: "Else", contentArray: ["C"]}
                ]}
            ]},
        ]);
    });
    it('should parse the if/elseif/elseif/else/endif template', async function() {
        const template = "{[if false]}A{[elseif false]}B{[elseif false]}C{[else]}D{[endif]}";
        const result = await textTemplater.parseTemplate(template);
        assert.deepEqual(result, [
            {type: "If", expr: "false", contentArray: [
                "A",
                {type: "ElseIf", expr: "false", contentArray: [
                    "B",
                    {type: "ElseIf", expr: "false", contentArray: [
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
            const result = await textTemplater.parseTemplate(template);
            assert.fail("expected error not thrown");
        } catch(err) {
            assert.equal(err, "ElseIf cannot follow an Else");
        }
    });
    it('should reject the if/else/else/endif template', async function() {
        const template = "{[if false]}A{[else]}B{[else]}C{[endif]}";
        try {
            const result = await textTemplater.parseTemplate(template);
            assert.fail("expected error not thrown");
        } catch(err) {
            assert.equal(err, "Else cannot follow an Else");
        }
    });
    it('should reject the if template (no endif)', async function() {
        const template = "{[if true]}A";
        try {
            const result = await textTemplater.parseTemplate(template);
            assert.fail("expected error not thrown");
        } catch(err) {
            assert.equal(err, "EndIf not found");
        }
    });
    it('should reject the if/else template (no endif)', async function() {
        const template = "{[if true]}A{[else]}B";
        try {
            const result = await textTemplater.parseTemplate(template);
            assert.fail("expected error not thrown");
        } catch(err) {
            assert.equal(err, "EndIf not found");
        }
    });
    it('should reject the if/endif/endif template', async function() {
        const template = "{[if true]}A{[endif]}{[endif]}";
        try {
            const result = await textTemplater.parseTemplate(template);
            assert.fail("expected error not thrown");
        } catch(err) {
            assert.equal(err, "Unmatched EndIf");
        }
    });
    it('should reject the if/endif/else template', async function() {
        const template = "{[if true]}A{[endif]}{[else]}B";
        try {
            const result = await textTemplater.parseTemplate(template);
            assert.fail("expected error not thrown");
        } catch(err) {
            assert.equal(err, "Unmatched Else");
        }
    });
    it('should reject the if/endif/elseif template', async function() {
        const template = "{[if true]}A{[endif]}{[elseif false]}B";
        try {
            const result = await textTemplater.parseTemplate(template);
            assert.fail("expected error not thrown");
        } catch(err) {
            assert.equal(err, "Unmatched ElseIf");
        }
    });
})

describe('Parsing nested conditionals', function() {
    it('should parse the if/if/endif/elseif/if/endif/else/if/endif/endif template', async function() {
        const template = "{[if false]}{[if true]}A{[endif]}{[elseif false]}{[if true]}B{[endif]}{[else]}{[if true]}C{[endif]}{[endif]}";
        const result = await textTemplater.parseTemplate(template);
        assert.deepEqual(result, [
            {type: "If", expr: "false", contentArray: [
                {type: "If", expr: "true", contentArray: ["A"]},
                {type: "ElseIf", expr: "false", contentArray: [
                    {type: "If", expr: "true", contentArray: ["B"]},
                    {type: "Else", contentArray: [
                        {type: "If", expr: "true", contentArray: ["C"]}
                    ]}
                ]}
            ]}
        ]);
    });
    it('should parse the if/if/elseif/else/endif/elseif/if/elseif/else/endif/else/if/elseif/else/endif/endif template', async function() {
        const template = "{[if false]}{[if false]}A{[elseif false]}B{[else]}C{[endif]}{[elseif false]}{[if true]}D{[elseif false]}E{[else]}F{[endif]}{[else]}{[if false]}G{[elseif false]}H{[else]}I{[endif]}{[endif]}";
        const result = await textTemplater.parseTemplate(template);
        assert.deepEqual(result, [
            {type: "If", expr: "false", contentArray: [
                {type: "If", expr: "false", contentArray: [
                    "A",
                    {type: "ElseIf", expr: "false", contentArray: [
                        "B",
                        {type: "Else", contentArray: ["C"]}
                    ]}
                ]},
                {type: "ElseIf", expr: "false", contentArray: [
                    {type: "If", expr: "true", contentArray: [
                        "D",
                        {type: "ElseIf", expr: "false", contentArray: [
                            "E",
                            {type: "Else", contentArray: ["F"]}
                        ]}
                    ]},
                    {type: "Else", contentArray: [
                        {type: "If", expr: "false", contentArray: [
                            "G",
                            {type: "ElseIf", expr: "false", contentArray: [
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
        const result = await textTemplater.parseTemplate(template);
        assert.deepEqual(result, [
            {type: "List", expr: "[]", contentArray: [
                {type: "Content", expr: "."},
            ]}
        ]);
    });
    it('should parse the list/list/endlist/endlist template', async function() {
        const template = "{[list []]}A: {[list inner]}{[.]}{[endlist inner]}{[endlist []]}";
        const result = await textTemplater.parseTemplate(template);
        assert.deepEqual(result, [
            {type: "List", expr: "[]", contentArray: [
                "A: ",
                {type: "List", expr: "inner", contentArray: [
                    {type: "Content", expr: "."},
                ]}
            ]}
        ]);
    });
    it('should reject the list template (missing endlist)', async function() {
        const template = "{[list []]}A";
        try {
            const result = await textTemplater.parseTemplate(template);
            assert.fail("expected error not thrown");
        } catch(err) {
            assert.equal(err, "EndList not found");
        }
    });
    it('should reject the endlist template (missing list)', async function() {
        const template = "A{[endlist]}";
        try {
            const result = await textTemplater.parseTemplate(template);
            assert.fail("expected error not thrown");
        } catch(err) {
            assert.equal(err, "Unmatched EndList");
        }
    });
    it('should reject the list/list/endlist template (missing endlist)', async function() {
        const template = "{[list []]}A{[list inner}B{[endlist]}";
        try {
            const result = await textTemplater.parseTemplate(template);
            assert.fail("expected error not thrown");
        } catch(err) {
            assert.equal(err, "EndList not found");
        }
    });
    it('should (for now) reject the list/else/endlist template', async function() {
        const template = "{[list []]}{[.]}{[else]}None{[endlist]}";
        try {
            const result = await textTemplater.parseTemplate(template);
            assert.fail("expected error not thrown");
        } catch(err) {
            assert.equal(err, "Else cannot be in a List");
        }
    });
})

describe('Parsing nested conditionals and lists', function() {
    it('should parse the list/if/elseif/else/endif/endlist template', async function() {
        const template = "{[list []]}{[if false]}A{[elseif .]}{[.]}{[else]}C{[endif]}, {[endlist]}";
        const result = await textTemplater.parseTemplate(template);
        assert.deepEqual(result, [
            {type: "List", expr: "[]", contentArray: [
                {type: "If", expr: "false", contentArray: [
                    "A",
                    {type: "ElseIf", expr: ".", contentArray: [
                        {type: "Content", expr: "."},
                        {type: "Else", contentArray: ["C"]}
                    ]}
                ]},
                ", "
            ]}
        ]);
    });
    it('should parse the if/list/endlist/elseif/list/list/endlist/endlist/else/list/endlist/endif template', async function() {
        const template = "{[if false]}{[list []]}{[test]}{[endlist]}{[elseif false]}A{[list outer]}B{[list inner]}C{[endlist]}D{[endlist]}E{[else]}F{[list another]}G{[endlist]}H{[endif]}";
        const result = await textTemplater.parseTemplate(template);
        assert.deepEqual(result, [
            {type: "If", expr: "false", contentArray: [
                {type: "List", expr: "[]", contentArray: [
                    {type: "Content", expr: "test"},
                ]},
                {type: "ElseIf", expr: "false", contentArray: [
                    "A",
                    {type: "List", expr: "outer", contentArray: [
                        "B",
                        {type: "List", expr: "inner", contentArray: ["C"]},
                        "D",
                    ]},
                    "E",
                    {type: "Else", contentArray: [
                        "F",
                        {type: "List", expr: "another", contentArray: ["G"]},
                        "H",
                    ]}
                ]}
            ]}
        ]);
    });
    it('should reject the list/endlist/endif template', async function() {
        const template = "{[list []]}A{[endlist]}{[endif]}";
        try {
            const result = await textTemplater.parseTemplate(template);
            assert.fail("expected error not thrown");
        } catch(err) {
            assert.equal(err, "Unmatched EndIf");
        }
    });
    it('should reject the list/endif template', async function() {
        const template = "{[list []]}A{[endif]}";
        try {
            const result = await textTemplater.parseTemplate(template);
            assert.fail("expected error not thrown");
        } catch(err) {
            assert.equal(err, "Unmatched EndIf");
        }
    });
    it('should reject the list/endif/endlist template', async function() {
        const template = "{[list []]}A{[endif]}{[endlist]}";
        try {
            const result = await textTemplater.parseTemplate(template);
            assert.fail("expected error not thrown");
        } catch(err) {
            assert.equal(err, "Unmatched EndIf");
        }
    });
    it('should reject the list/elseif/endlist template', async function() {
        const template = "{[list []]}A{[elseif false]}{[endlist]}";
        try {
            const result = await textTemplater.parseTemplate(template);
            assert.fail("expected error not thrown");
        } catch(err) {
            assert.equal(err, "ElseIf cannot be in a List");
        }
    });
    it('should reject the if/list/endif/endlist template', async function() {
        const template = "{[if true]}A{[list source]}B{[endif]}C{[endlist]}";
        try {
            const result = await textTemplater.parseTemplate(template);
            assert.fail("expected error not thrown");
        } catch(err) {
            assert.equal(err, "Unmatched EndIf");
        }
    });
    it('should reject the list/if/else/endlist/endif template', async function() {
        const template = "{[list source]}A{[if true]}B{[else]}C{[endlist]}{[endif]}";
        try {
            const result = await textTemplater.parseTemplate(template);
            assert.fail("expected error not thrown");
        } catch(err) {
            assert.equal(err, "Unmatched EndList");
        }
    });
    it('should (for now) reject the if/list/endlist/elseif/list/else/endlist/endif template', async function() {
        const template = "{[if false]}{[list source]}A{[endlist]}{[elseif true]}{[list second]}B{[else]}C{[endlist]}{[endif]}";
        try {
            const result = await textTemplater.parseTemplate(template);
            assert.fail("expected error not thrown");
        } catch(err) {
            assert.equal(err, "Else cannot be in a List");
        }
    });
})
