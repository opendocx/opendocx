const openDocx = require("../index");
const assert = require('assert');
const fs = require('fs');
const evaluator = require('../docx-evaluator');
const testUtil = require('./test-utils');

describe('Producing files necessary for .NET Unit Tests to run', function() {
    it('generates files for SimpleWill.docx', async function() {
        const templatePath = testUtil.GetTemplateNetPath('SimpleWill.docx');
        const result = await openDocx.compileDocx(templatePath, false); // false == don't clean up artifacts
        assert.equal(result.HasErrors, false);
        assert.equal(fs.existsSync(result.ExtractedLogic), true);
        assert.equal(fs.existsSync(result.DocxGenTemplate), true);
    })
    it('generates files for Lists.docx', async function() {
        const templatePath = testUtil.GetTemplateNetPath('Lists.docx');
        const result = await openDocx.compileDocx(templatePath, false); // false == don't clean up artifacts
        assert.equal(result.HasErrors, false);
        assert.equal(fs.existsSync(result.ExtractedLogic), true);
        assert.equal(fs.existsSync(result.DocxGenTemplate), true);
    })
})