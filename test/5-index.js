'use strict';

const openDocx = require("../index");
const assert = require('assert');
const fs = require('fs');
const testUtil = require('./test-utils');

describe('Full logic trees for DOCX Templates (experimental, white box)', function() {
    it('should produce a "logic tree" for a DOCX template and all its fields', async function() {
        const templatePath = testUtil.GetTemplatePath('TestNest.docx');
        let compiled = await openDocx.compileDocx(templatePath, false); // false suppresses cleanup of interim artifacts, and in fact produces extras such as this experimental AST
        assert(fs.existsSync(compiled.ExtractedLogicTree));
        let astLogic;
        assert.doesNotThrow(()=>{
            astLogic = JSON.parse(fs.readFileSync(compiled.ExtractedLogicTree, 'utf8'));
        });
        assert.deepStrictEqual(astLogic, TestNestLogicTree);
    })
    it('should not include redundant expressions when it includes the same if field multiple times', async function() {
        const templatePath = testUtil.GetTemplatePath('redundant_if.docx');
        let compiled = await openDocx.compileDocx(templatePath, false); // false suppresses cleanup of interim artifacts, and in fact produces extras such as this experimental AST
        assert(fs.existsSync(compiled.ExtractedLogicTree));
        let astLogic;
        assert.doesNotThrow(()=>{
            astLogic = JSON.parse(fs.readFileSync(compiled.ExtractedLogicTree, 'utf8'));
        });
        assert.deepStrictEqual(astLogic, redundant_if_logic_tree);
    })

});

const redundant_if_logic_tree = [
{
    "type": "If",
    "expr": "x",
    "exprAst": {
        "type": "Identifier",
        "name": "x",
        "constant": false
    },
    "new": true,
    "contentArray": [{
            "type": "Content",
            "expr": "adjective",
            "exprAst": {
                "type": "Identifier",
                "name": "adjective",
                "constant": false
            }
        }, {
            "type": "Else",
            "contentArray": []
        }
    ]
}, {
    "type": "Content",
    "expr": "name",
    "exprAst": {
        "type": "Identifier",
        "name": "name",
        "constant": false
    }
}, {
    "type": "If",
    "expr": "x",
    "exprAst": {
        "type": "Identifier",
        "name": "x",
        "constant": false
    },
    "new": false,
    "contentArray": [{
            "type": "Else",
            "contentArray": []
        }
    ]
}
];
/*
inferred from redundant_if_logic_tree:
relevant:
    x: true
    adjective: x
    name: true
required:
    x: false
    adjective: x
    name: true
*/

const TestNestLogicTree = [
    {
        type: "If",
        expr: "x",
        exprAst: {
            type: "Identifier",
            name: "x",
            constant: false
        },
        new: true,
        contentArray: [
            {
                type: "List",
                expr: "[]",
                exprAst: {
                    type: "ArrayExpression",
                    elements: [],
                    expectarray: true,
                    constant: true
                },
                contentArray: [
                    {
                        type: "Content",
                        expr: "test",
                        exprAst: {
                            type: "Identifier",
                            name: "test",
                            constant: false
                        },
                    },
                    {
                        type: "Content",
                        expr: "_punc",
                        exprAst: {
                            type: "Identifier",
                            name: "_punc",
                            constant: false
                        },
                    },
                ]
            },
            {
                type: "ElseIf",
                expr: "y",
                exprAst: {
                    type: "Identifier",
                    name: "y",
                    constant: false
                },
                new: true,
                contentArray: [
                    {
                        type: "Content",
                        expr: "A",
                        exprAst: {
                            type: "Identifier",
                            name: "A",
                            constant: false
                        },
                    },
                    {
                        type: "List",
                        expr: "outer",
                        exprAst: {
                            type: "Identifier",
                            name: "outer",
                            expectarray: true,
                            constant: false
                        },
                        contentArray: [
                            {
                                type: "Content",
                                expr: "z?B:B2",
                                exprAst: {
                                    type: "ConditionalExpression",
                                    test: {
                                        type: "Identifier",
                                        name: "z",
                                        constant: false
                                    },
                                    alternate: {
                                        type: "Identifier",
                                        name: "B",
                                        constant: false
                                    },
                                    consequent: {
                                        type: "Identifier",
                                        name: "B2",
                                        constant: false
                                    },
                                    constant: false
                                },
                            },
                            {
                                type: "List",
                                expr: "inner",
                                exprAst: {
                                    type: "Identifier",
                                    name: "inner",
                                    expectarray: true,
                                    constant: false
                                },
                                contentArray: [
                                    {
                                        type: "Content",
                                        expr: "C",
                                        exprAst: {
                                            type: "Identifier",
                                            name: "C",
                                            constant: false
                                        },
                                    },
                                    {
                                        type: "Content",
                                        expr: "_punc",
                                        exprAst: {
                                            type: "Identifier",
                                            name: "_punc",
                                            constant: false
                                        },
                                    },
                                ]
                            },
                            {
                                type: "Content",
                                expr: "D",
                                exprAst: {
                                    type: "Identifier",
                                    name: "D",
                                    constant: false
                                },
                            },
                            {
                                type: "Content",
                                expr: "_punc",
                                exprAst: {
                                    type: "Identifier",
                                    name: "_punc",
                                    constant: false
                                },
                            },
                        ]
                    },
                    {
                        type: "Content",
                        expr: "E",
                        exprAst: {
                            type: "Identifier",
                            name: "E",
                            constant: false
                        },
                    },
                    {
                        type: "Else",
                        contentArray: [
                            {
                                type: "Content",
                                expr: "F",
                                exprAst: {
                                    type: "Identifier",
                                    name: "F",
                                    constant: false
                                },
                            },
                            {
                                type: "List",
                                expr: "another",
                                exprAst: {
                                    type: "Identifier",
                                    name: "another",
                                    expectarray: true,
                                    constant: false
                                },
                                contentArray: [
                                    {
                                        type: "Content",
                                        expr: "G",
                                        exprAst: {
                                            type: "Identifier",
                                            name: "G",
                                            constant: false
                                        },
                                    },
                                    {
                                        type: "Content",
                                        expr: "_punc",
                                        exprAst: {
                                            type: "Identifier",
                                            name: "_punc",
                                            constant: false
                                        },
                                    },
                                ]
                            },
                            {
                                type: "Content",
                                expr: "H",
                                exprAst: {
                                    type: "Identifier",
                                    name: "H",
                                    constant: false
                                },
                            },
                        ]
                    },
                ]
            },
        ]
    },
];
