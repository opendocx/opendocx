const openDocx = require("../index");
const assert = require('assert');
const { TestHelperTypes } = require('yatte');

describe('AST Experimentation', function() {
    it('should retrieve ASTs for the fields in a DOCX template', async function() {
        //const template = "Oceans are:\n\n{[list Oceans]}\n * {[Name]} (Average depth {[AverageDepth]} m)\n{[endlist]}";
        //const compiled = templater.parseTemplate(template);
        //compiled.AST
        
        // temporarily/experimental: simulate schema "smartening" to be performed by Knackly app engine, based on information in Types
        //TestHelperTypes.estate_plan(data);

        //assert.equal(result.HasErrors, false);
    });
})
