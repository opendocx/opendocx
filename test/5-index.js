'use strict';

const openDocx = require("../src/index");
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
    "id": "1",
    "exprAst": {
        "type": "Identifier",
        "name": "x",
        "constant": false
    },
    "contentArray": [{
            "type": "Content",
            "expr": "adjective",
            "id": "2",
            "exprAst": {
                "type": "Identifier",
                "name": "adjective",
                "constant": false
            }
        }, {
            "type": "Else",
            "id": "3",
            "contentArray": []
        }
    ]
}, {
    "type": "Content",
    "expr": "name",
    "id": "5",
    "exprAst": {
        "type": "Identifier",
        "name": "name",
        "constant": false
    }
}, {
    "type": "If",
    "expr": "x",
    "id": "6",
    "exprAst": {
        "type": "Identifier",
        "name": "x",
        "constant": false
    },
    "contentArray": [{
            "type": "Else",
            "id": "7",
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
        id: '1',
        exprAst: {
            type: "Identifier",
            name: "x",
            constant: false
        },
        contentArray: [
            {
                type: "List",
                expr: "[]",
                id: '2',
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
                        id: '3',
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
                id: '5',
                exprAst: {
                    type: "Identifier",
                    name: "y",
                    constant: false
                },
                contentArray: [
                    {
                        type: "Content",
                        expr: "A",
                        id: '6',
                        exprAst: {
                            type: "Identifier",
                            name: "A",
                            constant: false
                        },
                    },
                    {
                        type: "List",
                        expr: "outer",
                        id: '7',
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
                                id: '8',
                                exprAst: {
                                    type: "ConditionalExpression",
                                    test: {
                                        type: "Identifier",
                                        name: "z",
                                        constant: false
                                    },
                                    fixed: true,
                                    consequent: {
                                        type: "Identifier",
                                        name: "B",
                                        constant: false
                                    },
                                    alternate: {
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
                                id: '9',
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
                                        id: '10',
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
                                id: '12',
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
                        id: '14',
                        exprAst: {
                            type: "Identifier",
                            name: "E",
                            constant: false
                        },
                    },
                    {
                        type: "Else",
                        id: '15',
                        contentArray: [
                            {
                                type: "Content",
                                expr: "F",
                                id: '16',
                                exprAst: {
                                    type: "Identifier",
                                    name: "F",
                                    constant: false
                                },
                            },
                            {
                                type: "List",
                                expr: "another",
                                id: '17',
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
                                        id: '18',
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
                                id: '20',
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
