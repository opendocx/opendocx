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
        [Fact]
        public void CompileSimpleWillTemplate()
        {
            string name = "SimpleWill.docx";
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
        public void CompileListsTemplate()
        {
            string name = "Lists.docx";
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
        public void CompileTeamReportTemplate()
        {
            string name = "team_report.docx";
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
        public void CompileABConditionalTemplate()
        {
            string name = "abconditional.docx";
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
        public void CompileCrasher()
        {
            string name = "crasher.docx";
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
