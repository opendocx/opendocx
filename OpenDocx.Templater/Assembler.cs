/***************************************************************************

Copyright (c) Lowell Stewart 2018-2019.
Licensed under the Mozilla Public License. See LICENSE file in the project root for full license information.

Published at https://github.com/opendocx/opendocx
Developer: Lowell Stewart
Email: lowell@opendocx.com

***************************************************************************/

using System;
using System.Threading.Tasks;
using System.IO;
using System.Xml;
using System.Xml.Linq;
using OpenXmlPowerTools;

namespace OpenDocx
{
    public class Assembler
    {
        public AssembleResult AssembleDocument(string templateFile, TextReader xmlData, string outputFile)
        {
            if (!File.Exists(templateFile))
                throw new FileNotFoundException("Template not found in the expected location", templateFile);
            WmlDocument templateDoc = new WmlDocument(templateFile); // reads the template's bytes into memory
            XElement data = xmlData.Peek() == -1 ? new XElement("none") : XElement.Load(xmlData);
            WmlDocument wmlAssembledDoc = DocumentAssembler.AssembleDocument(templateDoc, data, out bool templateError);
            if (templateError)
            {
                Console.WriteLine("Errors in template.");
                Console.WriteLine("See the assembled document to inspect errors.");
            }
            if (!string.IsNullOrEmpty(outputFile))
            {
                //// save the output (even in the case of error, since error messages are in the file)
                wmlAssembledDoc.SaveAs(outputFile);
                return new AssembleResult(outputFile, templateError);
            }
            else
            {
                return new AssembleResult(wmlAssembledDoc.DocumentByteArray, templateError);
            }
        }

        // when calling from Node.js via Edge, we only get to pass one parameter
        // assembly is synchronous, but when calling from Node.js (via Edge) we still need an async method
        #pragma warning disable CS1998
        public async Task<object> AssembleDocumentAsync(dynamic input)
        {
            var xmlData = (string)input.xmlData;
            var templateFile = (string)input.templateFile;
            var documentFile = (string)input.documentFile;
            await Task.Yield();
            using (var xmlReader = new StringReader(xmlData)) {
                try
                {
                    return AssembleDocument(templateFile, xmlReader, documentFile);
                }
                catch (XmlException e)
                {
                    e.Data.Add("xml", xmlData);
                    throw e;
                }
            }
        }
        #pragma warning restore CS1998

    }
}
