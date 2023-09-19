using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System.Xml;
using System.Xml.Linq;
using DocumentFormat.OpenXml.Packaging;
using OpenXmlPowerTools;
using OpenDocx;
using Xunit;
using Xunit.Abstractions;
using System.Dynamic;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace OpenDocxTemplater.Tests
{
    public class Tests
    {
        private readonly ITestOutputHelper output;

        public Tests(ITestOutputHelper output)
        {
            this.output = output;
        }

        [Theory]
        [InlineData("SimpleWill.docx")]
        [InlineData("Lists.docx")]
        [InlineData("team_report.docx")]
        [InlineData("abconditional.docx")]
        [InlineData("redundant_ifs.docx")]
        [InlineData("syntax_crash.docx")]
        [InlineData("acp.docx")]
        [InlineData("loandoc_example.docx")]
        [InlineData("list_punc_fmt.docx")]
        [InlineData("MultiLineField.docx")]
        public void CompileTemplate(string name)
        {
            DirectoryInfo sourceDir = new DirectoryInfo("../../../../test/templates/");
            FileInfo templateDocx = new FileInfo(Path.Combine(sourceDir.FullName, name));
            DirectoryInfo destDir = new DirectoryInfo("../../../../test/history/dot-net-results");
            FileInfo outputDocx = new FileInfo(Path.Combine(destDir.FullName, name));
            string templateName = outputDocx.FullName;
            templateDocx.CopyTo(templateName, true);
            var extractResult = OpenDocx.FieldExtractor.ExtractFields(templateName);
            Assert.True(File.Exists(extractResult.ExtractedFields));
            Assert.True(File.Exists(extractResult.TempTemplate));
            // check for valid JSON syntax
            Assert.True(IsValidJsonFile(extractResult.ExtractedFields));

            var templater = new Templater();
            // warning... the file 'templateName + "obj.fields.json"' must have been created by node.js external to this test. (hack/race)
            var compileResult = templater.CompileTemplate(templateName, extractResult.TempTemplate, templateName + "obj.fields.json");
            Assert.False(compileResult.HasErrors);
            Assert.True(File.Exists(compileResult.DocxGenTemplate));
        }

        private Boolean IsValidJsonFile(string filePath) {
            try {
                string json = File.ReadAllText(filePath);
                if (json.IndexOf('\r') >= 0) { // containing CR characters suggests bad line breaks
                    return false;
                }
                var val = JsonConvert.DeserializeObject<object>(json);
                return true;
            }
            catch (Exception) {
                return false;
            }
        }

        [Fact]
        public void CompileNested()
        {
            CompileTemplate("nested.docx");

            DirectoryInfo destDir = new DirectoryInfo("../../../../test/history/dot-net-results");
            FileInfo docxGenTemplate = new FileInfo(Path.Combine(destDir.FullName, "nested.docxgen.docx"));

            WmlDocument afterCompiling = new WmlDocument(docxGenTemplate.FullName);

            // make sure there are no nested content controls
            afterCompiling.MainDocumentPart.Element(W.body).Elements(W.sdt).ToList().ForEach(
                cc => Assert.Null(cc.Descendants(W.sdt).FirstOrDefault()));
        }

        [Theory]
        //[InlineData("MissingEndIfPara.docx")]
        //[InlineData("MissingEndIfRun.docx")]
        //[InlineData("MissingIfRun.docx")]
        //[InlineData("MissingIfPara.docx")]
        [InlineData("NonBlockIf.docx")]
        [InlineData("NonBlockEndIf.docx")]
        [InlineData("kMANT.docx")]
        //[InlineData("crasher.docx")]
        public void CompileErrors(string name)
        {
            DirectoryInfo sourceDir = new DirectoryInfo("../../../../test/templates/");
            FileInfo templateDocx = new FileInfo(Path.Combine(sourceDir.FullName, name));
            DirectoryInfo destDir = new DirectoryInfo("../../../../test/history/dot-net-results");
            FileInfo outputDocx = new FileInfo(Path.Combine(destDir.FullName, name));
            string templateName = outputDocx.FullName;
            templateDocx.CopyTo(templateName, true);
            var extractResult = OpenDocx.FieldExtractor.ExtractFields(templateName);
            Assert.True(File.Exists(extractResult.ExtractedFields));
            Assert.True(File.Exists(extractResult.TempTemplate));

            var templater = new Templater();
            // warning... the file 'templateName + "obj.fields.json"' must have been created by node.js external to this test. (hack/race)
            var compileResult = templater.CompileTemplate(templateName, extractResult.TempTemplate, templateName + "obj.fields.json");
            Assert.True(compileResult.HasErrors);
            Assert.True(File.Exists(compileResult.DocxGenTemplate));
        }

        [Theory]
        [InlineData("SmartTags.docx")] // this document has an invalid smartTag element (apparently inserted by 3rd party software)
        /*[InlineData("BadSmartTags.docx")]*/
        public void ValidateDocument(string name)
        {
            DirectoryInfo sourceDir = new DirectoryInfo("../../../../test/templates/");
            FileInfo docx = new FileInfo(Path.Combine(sourceDir.FullName, name));
            var validator = new Validator();
            var result = validator.ValidateDocument(docx.FullName);
            // oddly, Word will read this file (SmartTags.docx) without complaint, but it's still (apparently) invalid?
            // (check whether it is REALLY invalid, or whether we should patch ValidateDocument to accept it?)
            Assert.True(result.HasErrors);
        }

        [Fact]
        public void RemoveSmartTags()
        {
            string name = "SmartTags.docx"; // this document has an invalid smartTag element (apparently inserted by 3rd party software)
            DirectoryInfo sourceDir = new DirectoryInfo("../../../../test/templates/");
            FileInfo docx = new FileInfo(Path.Combine(sourceDir.FullName, name));
            DirectoryInfo destDir = new DirectoryInfo("../../../../test/history/dot-net-results");
            FileInfo outputDocx = new FileInfo(Path.Combine(destDir.FullName, name));
            string filePath = outputDocx.FullName;
            string outPath = Path.Combine(destDir.FullName, "SmartTags-Removed.docx");
            docx.CopyTo(filePath, true);
            WmlDocument doc = new WmlDocument(filePath);
            byte[] byteArray = doc.DocumentByteArray;
            WmlDocument transformedDoc = null;
            using (MemoryStream mem = new MemoryStream())
            {
                mem.Write(byteArray, 0, byteArray.Length);
                using (WordprocessingDocument wordDoc = WordprocessingDocument.Open(mem, true))
                {
                    var settings = new SimplifyMarkupSettings { RemoveSmartTags = true };// we try to remove smart tags, but the (apparently) invalid one is not removed correctly
                    MarkupSimplifier.SimplifyMarkup(wordDoc, settings);
                }
                transformedDoc = new WmlDocument(outPath, mem.ToArray());
                Assert.False(transformedDoc.MainDocumentPart.Descendants(W.smartTag).Any());
                transformedDoc.Save();
            }
            // transformedDoc still has leftover bits of the invalid smart tag, and should therefore be invalid
             // (consider whether it would be appropriate to patch SimplifyMarkup to correctly remove this apparently invalid smart tag?)
            var validator = new Validator();
            var result = validator.ValidateDocument(outPath);
            // MS Word also complains about the validity of this document
            Assert.True(result.HasErrors);
        }

        [Theory]
        [InlineData("Married RLT Plain.docx")]
        [InlineData("text_field_formatting.docx")]
        [InlineData("kMANT.docx")]
        public FieldExtractResult FieldExtractor(string name)
        {
            DirectoryInfo sourceDir = new DirectoryInfo("../../../../test/templates/");
            FileInfo templateDocx = new FileInfo(Path.Combine(sourceDir.FullName, name));
            DirectoryInfo destDir = new DirectoryInfo("../../../../test/history/dot-net-results");
            FileInfo outputDocx = new FileInfo(Path.Combine(destDir.FullName, name));
            string templateName = outputDocx.FullName;
            templateDocx.CopyTo(templateName, true);
            var extractResult = OpenDocx.FieldExtractor.ExtractFields(templateName);
            Assert.True(File.Exists(extractResult.ExtractedFields));
            Assert.True(File.Exists(extractResult.TempTemplate));
            return extractResult;
        }

        [Fact]
        public void RenderedPageBreakMasksDelimiters()
        {
            var extractResult = FieldExtractor("rend_page_break_in_delim.docx");
            // now read extract field JSON
            string json = File.ReadAllText(extractResult.ExtractedFields);
            var val = JsonConvert.DeserializeObject<JArray>(json);
            // (Past failure was: a "last rendered page break" in the Word markup, situated between the closing
            // ] and } of a field delimiter situated just at a page break, prevented the field extractor from
            // recognizing the field, leading to errors in processing/compiling the template.)
            var allFields = FlattenFields(val).ToArray();
            Assert.Equal(5, allFields.Length);
            // Make sure no recognized "fields" contain supposed field delimiters!
            foreach (JObject obj in allFields) {
                Assert.DoesNotContain("{[", (string)obj["contnt"]);
                Assert.DoesNotContain("]}", (string)obj["contnt"]);
            }
        }

        // [Theory]
        // [InlineData("Married RLT Plain.docx")]
        // [InlineData("text_field_formatting.docx")]
        // [InlineData("kMANT.docx")]
        // public async void FieldExtractorAsync(string name)
        // {
        //     DirectoryInfo sourceDir = new DirectoryInfo("../../../../test/templates/");
        //     FileInfo templateDocx = new FileInfo(Path.Combine(sourceDir.FullName, name));
        //     DirectoryInfo destDir = new DirectoryInfo("../../../../test/history/dot-net-results");
        //     FileInfo outputDocx = new FileInfo(Path.Combine(destDir.FullName, name));
        //     string templateName = outputDocx.FullName;
        //     templateDocx.CopyTo(templateName, true);
        //     dynamic options = new ExpandoObject();
        //     options.templateFile = templateName;
        //     options.removeCustomProperties = true;
        //     options.keepPropertyNames = new object[] { "UpdateFields" };
        //     var od = new OpenDocx.FieldExtractor();
        //     var extractResult = await od.ExtractFieldsAsync(options);
        //     Assert.True(File.Exists(extractResult.ExtractedFields));
        //     Assert.True(File.Exists(extractResult.TempTemplate));
        // }

        [Theory]
        [InlineData("HDLetter_Summary.docx", "«»")]
        // [InlineData("HDSingleTrust.docx", "«»")] // WAY too slow - eliminating test case because it kills test perf
        [InlineData("HDTrust_RLT.docx", "«»")]
        [InlineData("HDSimple.docx", "«»")]
        public async void FieldExtractorAltSyntaxAsync(string name, string delims)
        {
            DirectoryInfo sourceDir = new DirectoryInfo("../../../../test/templates/");
            FileInfo templateDocx = new FileInfo(Path.Combine(sourceDir.FullName, name));
            DirectoryInfo destDir = new DirectoryInfo("../../../../test/history/dot-net-results");
            FileInfo outputDocx = new FileInfo(Path.Combine(destDir.FullName, name));
            string templateName = outputDocx.FullName;
            templateDocx.CopyTo(templateName, true);
            dynamic options = new ExpandoObject();
            options.templateFile = templateName;
            options.fieldDelimiters = delims;
            options.removeCustomProperties = true;
            var od = new OpenDocx.FieldExtractor();
            var extractResult = await od.ExtractFieldsAsync(options);
            // now read extract field JSON
            string json = File.ReadAllText(extractResult.ExtractedFields);
            var val = JsonConvert.DeserializeObject<JArray>(json);
            // sub in field number tokens to test replacement for CCRemover
            var fieldMap = new FieldReplacementIndex();
            foreach (JObject obj in FlattenFields(val)) {
                var oid = (string)obj["id"]; 
                fieldMap[oid] = new FieldReplacement("=:" + oid + ":=");
            }
            // transform to Preview template
            string previewPath = templateName + "ncc.docx";
            var errors = TemplateTransformer.TransformTemplate(extractResult.TempTemplate,
                previewPath, TemplateFormat.PreviewDocx, fieldMap);
            Assert.True(File.Exists(previewPath));

            // also try a rudimentary map from alternate syntax to OpenDocx-ish field content (preparing for transform)
            var fieldMap2 = new FieldReplacementIndex();
            foreach (JObject obj in FlattenFields(val)) {
                var oid = (string)obj["id"]; 
                var oldContent = (string)obj["content"];
                fieldMap2[oid] = new FieldReplacement(MockMapFieldContent(oldContent), oldContent);
            }
            // test transform to OpenDocx Source template
            string destinationTemplatePath = templateName + "trans.docx";
            errors = TemplateTransformer.TransformTemplate(extractResult.TempTemplate,
                destinationTemplatePath, TemplateFormat.TextFieldSourceDocx, fieldMap2,
                "HotDocs", "HD");
            Assert.True(File.Exists(destinationTemplatePath));
            // var odv = new OpenDocx.Validator();
            // var vr = odv.ValidateDocument(destinationTemplatePath);
            // Assert.False(vr.HasErrors, vr.ErrorList);
        }

        [Theory]
        [InlineData("has_taskpanes.docx")]
        public async void RemoveTaskPanes(string name)
        {
            DirectoryInfo sourceDir = new DirectoryInfo("../../../../test/templates/");
            FileInfo templateDocx = new FileInfo(Path.Combine(sourceDir.FullName, name));
            DirectoryInfo destDir = new DirectoryInfo("../../../../test/history/dot-net-results");
            FileInfo outputDocx = new FileInfo(Path.Combine(destDir.FullName, name));
            string templateName = outputDocx.FullName;
            templateDocx.CopyTo(templateName, true);
            dynamic options = new ExpandoObject();
            options.templateFile = templateName;
            var od = new OpenDocx.FieldExtractor();
            var extractResult = await od.ExtractFieldsAsync(options);
            Assert.True(File.Exists(extractResult.TempTemplate));
            // ensure interim template (which SHOULD no longer have task panes) still validates
            var validator = new Validator();
            var result = validator.ValidateDocument(extractResult.TempTemplate);
            Assert.False(result.HasErrors, result.ErrorList);
        }

        private string GetTestTemplate(string name)
        {
            DirectoryInfo sourceDir = new DirectoryInfo("../../../../test/templates/");
            FileInfo sourceTemplateDocx = new FileInfo(Path.Combine(sourceDir.FullName, name));
            DirectoryInfo testDir = new DirectoryInfo("../../../../test/history/dot-net-results");
            FileInfo testTemplateDocx = new FileInfo(Path.Combine(testDir.FullName, sourceTemplateDocx.Name));
            string templateName = testTemplateDocx.FullName;
            sourceTemplateDocx.CopyTo(templateName, true);
            return templateName;
        }

        private XElement GetTestXmlData(string data)
        {
            DirectoryInfo sourceDir = new DirectoryInfo("../../../../test/templates/");
            FileInfo dataXml = new FileInfo(Path.Combine(sourceDir.FullName, data));
            return XElement.Load(dataXml.FullName);
        }

        private string GetTestOutput(string outName)
        {
            DirectoryInfo destDir = new DirectoryInfo("../../../../test/history/dot-net-results");
            FileInfo outputDocx = new FileInfo(Path.Combine(destDir.FullName, outName));
            return outputDocx.FullName;
        }


        [Theory]
        [InlineData("SimpleWillC.docx", "SimpleWillC.xml", "SimpleWillC-assembled.docx")]
        [InlineData("xmlerror.docx", "xmlerror.xml", "xmlerror-assembled.docx")]
        public async Task AssembleDocument(string name, string data, string outName)
        {
            var assembler = new OpenDocx.Assembler();
            var assembleResult = await assembler.AssembleDocAsync(
                GetTestTemplate(name),
                GetTestXmlData(data),
                GetTestOutput(outName),
                null);
            Assert.True(File.Exists(assembleResult.Document));
        }

        [Theory]
        [InlineData("SimpleWill.docx")]
        [InlineData("loandoc_example.docx")]
        public void FlattenTemplate(string name)
        {
            DirectoryInfo sourceDir = new DirectoryInfo("../../../../test/templates/");
            FileInfo templateDocx = new FileInfo(Path.Combine(sourceDir.FullName, name));
            DirectoryInfo destDir = new DirectoryInfo("../../../../test/history/dot-net-results");
            FileInfo outputDocx = new FileInfo(Path.Combine(destDir.FullName, "conv_" + name));
            string templateName = outputDocx.FullName;
            templateDocx.CopyTo(templateName, true);
            var extractResult = OpenDocx.FieldExtractor.ExtractFields(templateName);
            Assert.True(File.Exists(extractResult.TempTemplate));

            var remover = new OpenDocx.CCRemover();
            var compileResult = remover.RemoveCCs(templateName, extractResult.TempTemplate);
            Assert.False(compileResult.HasErrors);
            Assert.True(File.Exists(compileResult.DocxGenTemplate));
        }

        [Theory]
        [InlineData("inserttestc.docx", "insertedc.docx", false, "inserttestc.xml", "inserttestc-composed.docx")]
        [InlineData("inserttestd.docx", "insertedc.docx", false, "inserttestc.xml", "inserttestd-composed.docx")]
        [InlineData("insertteste.docx", "insertede.docx", false, "inserttestc.xml", "insertteste-composed.docx")]
        [InlineData("insertteste.docx", "insertedf.docx", false, "inserttestc.xml", "inserttestf-composed.docx")]
        [InlineData("DC-Main2SectInsIndirect.docx", "DC-MarginConditional.docx", true, "InsertKeepSectionsTest.xml", "insertkeepsections-composed.docx")]
        public async Task ComposeDocument(string name, string insert, bool keepsections, string data, string outName)
        {
            var mainData = GetTestXmlData(data);
            var assembler = new OpenDocx.Assembler();
            List<Source> sources = new List<Source>()
            {
                new TemplateSource(GetTestTemplate(insert), mainData, "inserted"),
            };
            sources[0].KeepSections = keepsections;
            var result3 = await assembler.AssembleDocAsync(
                GetTestTemplate(name),
                mainData,
                GetTestOutput(outName),
                sources);
            Assert.True(File.Exists(result3.Document));
        }

        //[Fact]
        //public void CompileTemplateSync()
        //{
        //    string name = "SimpleWill.docx";
        //    DirectoryInfo sourceDir = new DirectoryInfo("../../../../test/");
        //    FileInfo templateDocx = new FileInfo(Path.Combine(sourceDir.FullName, name));

        //    var templater = new Templater();
        //    //var compileResult = templater.CompileTemplate(templateDocx.FullName);
        //    //Assert.False(compileResult.HasErrors);
        //    //Assert.True(File.Exists(compileResult.DocxGenTemplate));
        //    //Assert.True(File.Exists(compileResult.ExtractedLogic));
        //    //Assert.Equal(err, returnedTemplateError);
        //}

        //[Fact]
        //public void CompileNested()
        //{
        //    string name = "TestNest.docx";
        //    DirectoryInfo sourceDir = new DirectoryInfo("../../../../test/");
        //    FileInfo templateDocx = new FileInfo(Path.Combine(sourceDir.FullName, name));

        //    var templater = new Templater();
        //    var compileResult = templater.CompileTemplate(templateDocx.FullName, "");
        //    Assert.False(compileResult.HasErrors);
        //    Assert.True(File.Exists(compileResult.DocxGenTemplate));
        //}

        //[Fact]
        //public void FieldExtractor()
        //{
        //    string name = "TestNest.docx";
        //    DirectoryInfo sourceDir = new DirectoryInfo("../../../../test/");
        //    FileInfo templateDocx = new FileInfo(Path.Combine(sourceDir.FullName, name));

        //    var extractResult = OpenDocx.FieldExtractor.ExtractFields(templateDocx.FullName);
        //    Assert.True(File.Exists(extractResult.ExtractedFields));
        //    Assert.True(File.Exists(extractResult.TempTemplate));
        //}

        //[Fact]
        //public void FieldExtractor2()
        //{
        //    string name = "TestNestNoCC.docx";
        //    DirectoryInfo sourceDir = new DirectoryInfo("../../../../test/");
        //    FileInfo templateDocx = new FileInfo(Path.Combine(sourceDir.FullName, name));

        //    var extractResult = OpenDocx.FieldExtractor.ExtractFields(templateDocx.FullName);
        //    Assert.True(File.Exists(extractResult.ExtractedFields));
        //    Assert.True(File.Exists(extractResult.TempTemplate));
        //}

        internal IEnumerable<JToken> FlattenFields(JToken item) {
            if (item.Type == JTokenType.Array) {
                foreach (var element in item) {
                    foreach (var subElement in FlattenFields(element)) {
                        yield return subElement;
                    }
                }
            } else {
                yield return item;
            }
        }

        internal string MockMapFieldContent(string content) {
            if (content.StartsWith("IF "))
                return "if " + content.Substring(3);
            if (content.StartsWith("ELSE IF "))
                return "elseif " + content.Substring(8);
            if (content.StartsWith("ELSE"))
                return "else";
            if (content.StartsWith("END IF"))
                return "endif";
            if (content.StartsWith("REPEAT "))
                return "list " + content.Substring(7);
            if (content.StartsWith("END REPEAT"))
                return "endlist";
            if (content.StartsWith("INSERT "))
                return content.Substring(7);
            // else assume merge field
            return content;
        }
    }
}
