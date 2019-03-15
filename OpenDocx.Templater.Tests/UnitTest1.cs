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
        public async Task CompileTemplate1()
        {
            string name = "SimpleWill.docx";
            //string data = "DA-Data.xml";
            DirectoryInfo sourceDir = new DirectoryInfo("../../../../test/");
            FileInfo templateDocx = new FileInfo(Path.Combine(sourceDir.FullName, name));
            //FileInfo dataFile = new FileInfo(Path.Combine(sourceDir.FullName, data));

            WmlDocument wmlTemplate = new WmlDocument(templateDocx.FullName);
            //XElement xmldata = XElement.Load(dataFile.FullName);

            dynamic payload = new ExpandoObject();
            payload.templateFile = templateDocx.FullName;
            var templater = new Templater();
            await templater.CompileTemplateAsync(payload);
//            WmlDocument afterAssembling = DocumentAssembler.AssembleDocument(wmlTemplate, xmldata, out returnedTemplateError);
//            var assembledDocx = new FileInfo(Path.Combine(TestUtil.TempDir.FullName, templateDocx.Name.Replace(".docx", "-processed-by-DocumentAssembler.docx")));
//            afterAssembling.SaveAs(assembledDocx.FullName);

//            using (MemoryStream ms = new MemoryStream())
//            {
//                ms.Write(afterAssembling.DocumentByteArray, 0, afterAssembling.DocumentByteArray.Length);
//                using (WordprocessingDocument wDoc = WordprocessingDocument.Open(ms, true))
//                {
//                    OpenXmlValidator v = new OpenXmlValidator();
//                    //var valErrors = v.Validate(wDoc).Where(ve => !s_ExpectedErrors.Contains(ve.Description));

//#if false
//                    StringBuilder sb = new StringBuilder();
//                    foreach (var item in valErrors.Select(r => r.Description).OrderBy(t => t).Distinct())
//	                {
//		                sb.Append(item).Append(Environment.NewLine);
//	                }
//                    string z = sb.ToString();
//                    Console.WriteLine(z);
//#endif

//                    //Assert.Empty(valErrors);
//                }
//            }

            //Assert.Equal(err, returnedTemplateError);
        }
    }
}
