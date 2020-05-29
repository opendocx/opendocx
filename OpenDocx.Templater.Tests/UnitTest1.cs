using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Xml;
using System.Xml.Linq;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Validation;
using OpenXmlPowerTools;
using OpenDocx;
using Xunit;
using System.Dynamic;

namespace OpenDocxTemplater.Tests
{
    public class Tests
    {
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

            var templater = new Templater();
            // warning... the file 'templateName + "obj.fields.json"' must have been created by node.js external to this test. (hack/race)
            var compileResult = templater.CompileTemplate(templateName, extractResult.TempTemplate, templateName + "obj.fields.json");
            Assert.False(compileResult.HasErrors);
            Assert.True(File.Exists(compileResult.DocxGenTemplate));
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
        public void FieldExtractor(string name)
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
        }

        [Theory]
        [InlineData("Married RLT Plain.docx")]
        [InlineData("text_field_formatting.docx")]
        [InlineData("kMANT.docx")]
        public async void FieldExtractorAsync(string name)
        {
            DirectoryInfo sourceDir = new DirectoryInfo("../../../../test/templates/");
            FileInfo templateDocx = new FileInfo(Path.Combine(sourceDir.FullName, name));
            DirectoryInfo destDir = new DirectoryInfo("../../../../test/history/dot-net-results");
            FileInfo outputDocx = new FileInfo(Path.Combine(destDir.FullName, name));
            string templateName = outputDocx.FullName;
            templateDocx.CopyTo(templateName, true);
            dynamic options = new ExpandoObject();
            options.templateFile = templateName;
            options.removeCustomProperties = true;
            options.keepPropertyNames = new object[] { "UpdateFields" };
            var od = new OpenDocx.FieldExtractor();
            var extractResult = await od.ExtractFieldsAsync(options);
            Assert.True(File.Exists(extractResult.ExtractedFields));
            Assert.True(File.Exists(extractResult.TempTemplate));
        }

        [Fact]
        public void XmlError()
        {
            string name = "xmlerror.docx";
            DirectoryInfo sourceDir = new DirectoryInfo("../../../../test/templates/");
            FileInfo templateDocx = new FileInfo(Path.Combine(sourceDir.FullName, name));
            FileInfo dataXml = new FileInfo(Path.Combine(sourceDir.FullName, "xmlerror.xml"));
            DirectoryInfo destDir = new DirectoryInfo("../../../../test/history/dot-net-results");
            FileInfo outputDocx = new FileInfo(Path.Combine(destDir.FullName, name));
            string templateName = outputDocx.FullName;
            string resultName = Path.Combine(destDir.FullName, "xmlerror-assembled.docx");
            templateDocx.CopyTo(templateName, true);
            var assembler = new OpenDocx.Assembler();
            AssembleResult assembleResult;
            using (var xmlData = new StreamReader(dataXml.FullName, System.Text.Encoding.UTF8)) {
                assembleResult = assembler.AssembleDocument(templateName, xmlData, resultName);
            }
            Assert.True(File.Exists(assembleResult.Document));
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

    }
}
