const opendocx = require('../src/index');
const templater = require('../src/docx-templater');
//const TestHelperTypes = yatte.TestHelperTypes;
const assert = require('assert');
const fs = require('fs');
const testUtil = require('./test-utils');

describe('Extracting fields from DOCX templates (white box)', async function() {
    it('should produce expected interim artifacts when compiling SimpleWill.docx', async function() {
        this.timeout(10000); // definitely shouldn't take that long!!  But it can occasionally take a couple/few seconds.
        this.slow(2500);
        const templatePath = testUtil.GetTemplatePath('SimpleWill.docx');
        const result = await opendocx.compileDocx(templatePath, false); // false to suppress cleanup of interim artifacts during compilation
        // results of initial field extraction:
        assert(fs.existsSync(result.ExtractedFields));
        let fields;
        assert.doesNotThrow(()=>{
            fields = JSON.parse(fs.readFileSync(result.ExtractedFields, 'utf8'));
        });
        const validation = await templater.validateDocument({documentFile: result.TempTemplate});
        assert.ok(!validation.HasErrors, validation.ErrorList);
        assert(fs.existsSync(result.FieldMap));
        let fieldMap;
        assert.doesNotThrow(()=>{
            fieldMap = JSON.parse(fs.readFileSync(result.FieldMap, 'utf8'));
        });
        assert(fs.existsSync(result.ExtractedLogicTree));
        let astLogic;
        assert.doesNotThrow(()=>{
            astLogic = JSON.parse(fs.readFileSync(result.ExtractedLogicTree, 'utf8'));
        });
        assert(fs.existsSync(result.ExtractedLogic));
        let jsfunc;
        assert.doesNotThrow(()=>{
            jsfunc = require(result.ExtractedLogic);
        });
        const validation2 = await templater.validateDocument({documentFile: result.DocxGenTemplate});
        assert.ok(!validation2.HasErrors, validation2.ErrorList);
    });
})
