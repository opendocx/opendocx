const openDocx = require("../index");
const assert = require('assert');
const fs = require('fs');
const evaluator = require('../docx-evaluator');
const testUtil = require('./test-utils');

describe('Producing files necessary for .NET Unit Tests to run', function() {

    async function generateFilesFor(name) {
        const templatePath = testUtil.GetTemplateNetPath(name);
        return await openDocx.compileDocx(templatePath, false); // false == don't clean up artifacts
    }

    it('generates files for SimpleWill.docx', async function() {
        const result = await generateFilesFor('SimpleWill.docx')
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
    it('generates files for MissingEndIfPara.docx', async function() {
        assert.rejects( async () => {
            const result = await generateFilesFor('MissingEndIfPara.docx')
            assert.equal(fs.existsSync(result.ExtractedLogic), true);
        })
    })
    it('generates files for MissingEndIfRun.docx', async function() {
        assert.rejects( async () => {
            const result = await generateFilesFor('MissingEndIfRun.docx')
            assert.equal(fs.existsSync(result.ExtractedLogic), true);
        })
    })
    it('generates files for MissingIfRun.docx', async function() {
        assert.rejects( async () => {
            const result = await generateFilesFor('MissingIfRun.docx')
            assert.equal(fs.existsSync(result.ExtractedLogic), true);
        })
    })
    it('generates files for MissingIfPara.docx', async function() {
        assert.rejects( async () => {
            const result = await generateFilesFor('MissingIfPara.docx')
            assert.equal(fs.existsSync(result.ExtractedLogic), true);
        })
    })
    it('generates files for NonBlockIf.docx', async function() {
        const result = await generateFilesFor('NonBlockIf.docx')
        assert.equal(fs.existsSync(result.ExtractedLogic), true);
    })
    it('generates files for NonBlockEndIf.docx', async function() {
        const result = await generateFilesFor('NonBlockEndIf.docx')
        assert.equal(fs.existsSync(result.ExtractedLogic), true);
    })
    it('generates files for Syntax.docx', async function() {
        const result = await generateFilesFor('Syntax.docx')
        assert.equal(fs.existsSync(result.ExtractedLogic), true);
    })
})