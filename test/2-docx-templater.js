const openDocx = require("../src/index");
const assert = require('assert');
const fs = require('fs');
const evaluator = require('../src/docx-evaluator');
const testUtil = require('./test-utils');

describe('Producing files necessary for .NET Unit Tests to run', function() {

    async function generateFilesFor(name) {
        const templatePath = testUtil.GetTemplateNetPath(name);
        return await openDocx.compileDocx(templatePath, undefined, undefined, false);
    }

    it('generates files for SimpleWill.docx', async function() {
        const result = await generateFilesFor('SimpleWill.docx')
        assert.equal(fs.existsSync(result.ExtractedLogic), true);
    })
    it('generates files for nested.docx', async function() {
        const result = await generateFilesFor('nested.docx')
        assert.equal(fs.existsSync(result.ExtractedLogic), true);
    })
    it('generates files for redundant_ifs.docx', async function() {
        const result = await generateFilesFor('redundant_ifs.docx')
        assert.equal(fs.existsSync(result.ExtractedLogic), true);
    })
    it('generates files for team_report.docx', async function() {
        const result = await generateFilesFor('team_report.docx')
        assert.equal(fs.existsSync(result.ExtractedLogic), true);
    })
    it('generates files for abconditional.docx', async function() {
        const result = await generateFilesFor('abconditional.docx')
        assert.equal(fs.existsSync(result.ExtractedLogic), true);
    })
    it('generates files for Lists.docx', async function() {
        const result = await generateFilesFor('Lists.docx')
        assert.equal(fs.existsSync(result.ExtractedLogic), true);
    })
    it('generates files for syntax_crash.docx', async function() {
        const result = await generateFilesFor('syntax_crash.docx')
        assert.equal(fs.existsSync(result.ExtractedLogic), true);
    })
    it('generates files for Syntax.docx', async function() {
        const result = await generateFilesFor('Syntax.docx')
        assert.equal(fs.existsSync(result.ExtractedLogic), true);
    })
    it('generates files for acp.docx', async function() {
        const result = await generateFilesFor('acp.docx')
        assert.equal(fs.existsSync(result.ExtractedLogic), true);
    })
    it('generates files for ifpoa.docx', async function() {
        const result = await generateFilesFor('ifpoa.docx')
        assert.equal(fs.existsSync(result.ExtractedLogic), true);
    })
    it('generates files for loandoc_example.docx', async function() {
        const result = await generateFilesFor('loandoc_example.docx')
        assert.equal(fs.existsSync(result.ExtractedLogic), true);
    })
    it('generates files for list_punc_fmt.docx', async function() {
        const result = await generateFilesFor('list_punc_fmt.docx')
        assert.equal(fs.existsSync(result.ExtractedLogic), true);
    })
    it('generates files for custom_props.docx', async function() {
        const templatePath = testUtil.GetTemplateNetPath('custom_props.docx');
        const result = await openDocx.compileDocx(templatePath, true, ['UpdateFields'], false);
        assert.equal(fs.existsSync(result.ExtractedLogic), true);
    })
    it('generates valid field JSON for MultiLineField.docx', async function() {
        const result = await generateFilesFor('MultiLineField.docx')
        assert.equal(fs.existsSync(result.ExtractedLogic), true);
        // assert.doesNotThrow(() => {
        //     const extractedFieldJson = fs.readFileSync(result.ExtractedFields, 'utf8')
        //     const fieldList = JSON.parse(extractedFieldJson)
        // })
    })

    // expected rejections...
    it('throws error for MissingEndIfPara.docx', async function() {
        assert.rejects( async () => {
            const result = await generateFilesFor('MissingEndIfPara.docx')
            assert.equal(fs.existsSync(result.ExtractedLogic), true);
        }, new Error('Field 1\'s If has no matching EndIf'))
    })
    it('throws error for MissingEndIfRun.docx', async function() {
        assert.rejects( async () => {
            const result = await generateFilesFor('MissingEndIfRun.docx')
            assert.equal(fs.existsSync(result.ExtractedLogic), true);
        }, new Error('Field 1\'s If has no matching EndIf'))
    })
    it('throws error for MissingIfRun.docx', async function() {
        assert.rejects( async () => {
            const result = await generateFilesFor('MissingIfRun.docx')
            assert.equal(fs.existsSync(result.ExtractedLogic), true);
        }, new Error('Field 2\'s EndIf has no matching If'))
    })
    it('throws error for MissingIfPara.docx', async function() {
        assert.rejects( async () => {
            const result = await generateFilesFor('MissingIfPara.docx')
            assert.equal(fs.existsSync(result.ExtractedLogic), true);
        }, new Error('Field 2\'s EndIf has no matching If'))
    })
    it('throws error for NonBlockIf.docx', async function() {
        assert.rejects( async () => {
            const result = await generateFilesFor('NonBlockIf.docx')
            assert.equal(fs.existsSync(result.ExtractedLogic), true);
        }, new Error('Field 1\'s If has no matching EndIf'))
    })
    it('throws error for NonBlockEndIf.docx', async function() {
        assert.rejects( async () => {
            const result = await generateFilesFor('NonBlockEndIf.docx')
            assert.equal(fs.existsSync(result.ExtractedLogic), true);
        }, new Error('Field 3\'s EndIf has no matching If'))
    })
    it('throws error for kMANT.docx', async function() {
        assert.rejects( async () => {
            const result = await generateFilesFor('kMANT.docx')
            assert.equal(fs.existsSync(result.ExtractedLogic), true);
        }, new Error('Field 3\'s EndIf has no matching If'))
    })
    it('throws syntax error for crasher.docx', async function() {
        assert.rejects(async () => {
            const result = await generateFilesFor('crasher.docx')
            //assert.equal(fs.existsSync(result.ExtractedLogic), true);
        }, new SyntaxError(
            'Syntax Error: \'"1, 2, and 3"\' is not a valid identifier:\n' +
            'Children|"1, 2, and 3"\n' +
            '         ^^^^^^^^^^^^^' +
            ' [in field 18]'))
    })
    it('throw syntax error for Married RLT Plain.docx', async function() {
        assert.rejects(async () => {
            const result = await generateFilesFor('Married RLT Plain.docx')
            //assert.equal(fs.existsSync(result.ExtractedLogic), true);
        }, new Error('Field 223\'s Else has no matching If'))
    })
})
