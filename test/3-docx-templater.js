const openDocx = require("../index");
const assert = require('assert');
const fs = require('fs');
const evaluator = require('../docx-evaluator');
const types = require('./types-test');

describe('3 - Pre-processing docx templates', function() {
    // it('should pre-process a docx template', async function() {
    //     const template = "test/SimpleWill.docx";
    //     const result = await openDocx.registerTemplate(template);
    //     assert.ok(true);
    // });
    it('should create a js function that can execute against its contextHelper with an empty context', async function() {
        const template = "test/SimpleWill.docx";
        const result = await openDocx.compileDocx(template);
        const str = evaluator.assembleXml({}, result.ExtractedLogic);
        assert.equal(str, '<?xml version="1.0"?><data><a/><A/><b/><B/><c/><C/><d/><D/><e/><E>false</E><h></h><l/><L/><m/><M/><n/><N/><o/><O/></data>');
    });
    it('previously generated js function should execute against its contextHelper with a fully populated smart context', async function() {
        const template = "test/SimpleWill.docx";
        const data = SimpleWillDemoContext;
        // simulate schema "smartening" to be performed by app engine, based on information in Types
        types.estate_plan(data);
        // now evaluate the helper against this "smart" data context, to test its functionality
        const str = evaluator.assembleXml(data, template + ".js");
        fs.writeFileSync('./' + template + '.asmdata.xml', str);
        assert.equal(str,
            '<?xml version="1.0"?><data><a>John Smith</a><A>Jonestown</A><b>Lebanon</b><B>Pennsylvania</B><c>Kim Johnston</c><C>Philadelphia</C><d>Philadelphia</d><D>Pennsylvania</D><e/><E>true</E><f>Tina Turner</f><F>Los Angeles</F><g>Los Angeles</g><G>California</G><h><h0><H>1</H><i>st</i><I>Kelly Smith</I><j>1234 Anystreet, Allentown, PA</j><J>Daughter</J><k>5555</k><K>My cat.</K></h0><h0><H>2</H><i>nd</i><I>John Smith Jr.</I><j>54321 Geronimo, Jonestown, PA</j><J>Son</J><k>4444</k><K>My house.</K></h0><h0><H>3</H><i>rd</i><I>Diane Kennedy</I><j>Unknown</j><J>Mistress</J><k/><K>My misguided affection.</K></h0><h0><H>4</H><i>th</i><I>Tim Billingsly</I><j>Boulder, CO</j><J>cat</J><k/><K>Everything else.</K></h0></h><l>Pennsylvania</l><L>10th day of March, 2019</L><m>him</m><M>his</M><n>John Doe</n><N>Marilyn Monroe</N><o>PENNSYLVANIA</o><O>ALLEGHENY</O></data>');
    });
    it('list testing', async function() {
        const template = "test/Lists.docx";
        const result = await openDocx.compileDocx(template);
        assert.equal(result.HasErrors, false);
        const jsFile = result.ExtractedLogic;
        //const compiledTemplate = result.DocxGenTemplate;
        const data = {Children:[{Name:'Greg',Birthdate:'1954-09-30'},{Name:'Marcia',Birthdate:'1956-08-05'},{Name:'Peter',Birthdate:'1957-11-07'},{Name:'Jan',Birthdate:'1958-04-29'},{Name:'Bobby',Birthdate:'1960-12-19'},{Name:'Cindy',Birthdate:'1961-08-14'}]};
        // simulate schema "smartening" to be performed by app engine, based on information in Types
        types._list_of(types.child, data.Children);
        // now evaluate the helper against this "smart" data context, to test its functionality
        const str = evaluator.assembleXml(data, jsFile);
        fs.writeFileSync('./' + template + '.asmdata.xml', str);
        // note: lists do not (currently) get optimized in the XML -- every time a template repeats through a list, another copy of the list is stored in the XML. This is because I haven't done the work yet to optimize that part.
        // it works well enough this way, but in the future (if the XML chunks are so big they're slowing something down) we can optimize it better.
        assert.equal(str,
            '<?xml version="1.0"?><data><a><a0><A>Greg</A></a0><a0><A>Marcia</A></a0><a0><A>Peter</A></a0><a0><A>Jan</A></a0><a0><A>Bobby</A></a0><a0><A>Cindy</A></a0></a><b><b0><B>Greg</B><c>09/30/1954</c></b0><b0><B>Marcia</B><c>08/05/1956</c></b0><b0><B>Peter</B><c>11/07/1957</c></b0><b0><B>Jan</B><c>04/29/1958</c></b0><b0><B>Bobby</B><c>12/19/1960</c></b0><b0><B>Cindy</B><c>08/14/1961</c></b0></b></data>');
    });
})

const SimpleWillDemoContext = {
    Testator: {
        Name: "John Smith",
        City: "Jonestown",
        State: "Pennsylvania",
        County: "Lebanon",
        Gender: "Male"
    },
    GoverningLaw: "Pennsylvania",
    SigningDate: "2019-03-10",
    Witness1Name: "John Doe",
    Witness2Name: "Marilyn Monroe",
    NotaryCounty: "Allegheny",
    NominateBackup: true,
    Representative: {
        Name: "Kim Johnston",
        City: "Philadelphia",
        State: "Pennsylvania",
        County: "Philadelphia",
        Gender: "Female",
    },
    BackupRepresentative: {
        Name: "Tina Turner",
        City: "Los Angeles",
        State: "California",
        County: "Los Angeles",
        Gender: "Female",
    },
    Beneficiaries: [
        {
            Name: "Kelly Smith",
            Address: "1234 Anystreet, Allentown, PA",
            Relationship: "Daughter",
            SSNLast4: "5555",
            PropertyBequeath: "My cat."
        },
        {
            Name: "John Smith Jr.",
            Address: "54321 Geronimo, Jonestown, PA",
            Relationship: "Son",
            SSNLast4: "4444",
            PropertyBequeath: "My house."
        },
        {
            Name: "Diane Kennedy",
            Address: "Unknown",
            Relationship: "Mistress",
            PropertyBequeath: "My misguided affection."
        },
        {
            Name: "Tim Billingsly",
            Address: "Boulder, CO",
            Relationship: "cat",
            PropertyBequeath: "Everything else."
        },
    ],
};
