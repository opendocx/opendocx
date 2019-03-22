'use strict';

const openDocx = require("../index");
const assert = require('assert');


describe('AST Experimentation', function() {
    it('should work', async function() {
        const templatePath = "test/SimpleWill.docx";
        let compiled = await openDocx.compileDocx(templatePath);
        assert(true);
    });

    // it('should retrieve a unified AST for a DOCX template', async function() {
    //     const template = "test/TestNest.docx";
    //     let compiled = await openDocx.compileDocx(template);
    //     let result = openDocx.extractFields(template);
    //     assert.deepEqual(result, [
    //         {
    //             type: "If",
    //             expr: "x",
    //             exprAst: {
    //                 type: "Identifier",
    //                 name: "x",
    //                 constant: false
    //             },
    //             atom: "a",
    //             contentArray: [
    //                 {
    //                     type: "List",
    //                     expr: "[]",
    //                     exprAst: {
    //                         type: "ArrayExpression",
    //                         elements: [],
    //                         expectarray: true,
    //                         constant: true
    //                     },
    //                     atom: "A",
    //                     contentArray: [
    //                         {
    //                             type: "Content",
    //                             expr: "test",
    //                             exprAst: {
    //                                 type: "Identifier",
    //                                 name: "test",
    //                                 constant: false
    //                             },
    //                             atom: "b",
    //                         },
    //                     ]
    //                 },
    //                 {
    //                     type: "ElseIf",
    //                     expr: "y",
    //                     exprAst: {
    //                         type: "Identifier",
    //                         name: "y",
    //                         constant: false
    //                     },
    //                     atom: "B",
    //                     contentArray: [
    //                         {
    //                             type: "Content",
    //                             expr: "A",
    //                             exprAst: {
    //                                 type: "Identifier",
    //                                 name: "A",
    //                                 constant: false
    //                             },
    //                             atom: "c",
    //                         },
    //                         {
    //                             type: "List",
    //                             expr: "outer",
    //                             exprAst: {
    //                                 type: "Identifier",
    //                                 name: "outer",
    //                                 expectarray: true,
    //                                 constant: false
    //                             },
    //                             atom: "C",
    //                             contentArray: [
    //                                 {
    //                                     type: "Content",
    //                                     expr: "z?B:B2",
    //                                     exprAst: {
    //                                         type: "ConditionalExpression",
    //                                         test: {
    //                                             type: "Identifier",
    //                                             name: "z",
    //                                             constant: false
    //                                         },
    //                                         alternate: {
    //                                             type: "Identifier",
    //                                             name: "B",
    //                                             constant: false
    //                                         },
    //                                         consequent: {
    //                                             type: "Identifier",
    //                                             name: "B2",
    //                                             constant: false
    //                                         },
    //                                         constant: false
    //                                     },
    //                                     atom: "d",
    //                                 },
    //                                 {
    //                                     type: "List",
    //                                     expr: "inner",
    //                                     exprAst: {
    //                                         type: "Identifier",
    //                                         name: "inner",
    //                                         expectarray: true,
    //                                         constant: false
    //                                     },
    //                                     atom: "D",
    //                                     contentArray: [
    //                                         {
    //                                             type: "Content",
    //                                             expr: "C",
    //                                             exprAst: {
    //                                                 type: "Identifier",
    //                                                 name: "C",
    //                                                 constant: false
    //                                             },
    //                                             atom: "e",
    //                                         },
    //                                     ]
    //                                 },
    //                                 {
    //                                     type: "Content",
    //                                     expr: "D",
    //                                     exprAst: {
    //                                         type: "Identifier",
    //                                         name: "D",
    //                                         constant: false
    //                                     },
    //                                     atom: "E",
    //                                 },
    //                             ]
    //                         },
    //                         {
    //                             type: "Content",
    //                             expr: "E",
    //                             exprAst: {
    //                                 type: "Identifier",
    //                                 name: "E",
    //                                 constant: false
    //                             },
    //                             atom: "f",
    //                         },
    //                         {
    //                             type: "Else",
    //                             contentArray: [
    //                                 {
    //                                     type: "Content",
    //                                     expr: "F",
    //                                     exprAst: {
    //                                         type: "Identifier",
    //                                         name: "F",
    //                                         constant: false
    //                                     },
    //                                     atom: "F",
    //                                 },
    //                                 {
    //                                     type: "List",
    //                                     expr: "another",
    //                                     exprAst: {
    //                                         type: "Identifier",
    //                                         name: "another",
    //                                         expectarray: true,
    //                                         constant: false
    //                                     },
    //                                     atom: "g",
    //                                     contentArray: [
    //                                         {
    //                                             type: "Content",
    //                                             expr: "G",
    //                                             exprAst: {
    //                                                 type: "Identifier",
    //                                                 name: "G",
    //                                                 constant: false
    //                                             },
    //                                             atom: "G",
    //                                         },
    //                                     ]
    //                                 },
    //                                 {
    //                                     type: "Content",
    //                                     expr: "H",
    //                                     exprAst: {
    //                                         type: "Identifier",
    //                                         name: "H",
    //                                         constant: false
    //                                     },
    //                                     atom: "h",
    //                                 },
    //                             ]
    //                         },
    //                     ]
    //                 },
    //             ]
    //         },
    //     ]);
    // });
})
