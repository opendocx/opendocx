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
    class Assembler
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
            //// save the output (even in the case of error, since error messages are in the file)
            wmlAssembledDoc.SaveAs(outputFile);
            return new AssembleResult(outputFile, templateError);
        }

        // when calling from Node.js via Edge, we only get to pass one parameter
        public object AssembleDocument(dynamic input)
        {
            // EdgeJS is messing up the string encoding. Node.js marshals the string in a UTF-8 encoded byte array,
            // but EdgeJS decodes it using the system's default ANSI encoding (usually ISO-8859-1, at least on Windows).
            // So we have to undo it:
            var ms = new MemoryStream(System.Text.Encoding.GetEncoding(28591 /*ISO-8859-1*/).GetBytes((string)input.xmlData));
            using (var xmlData = new StreamReader(ms, System.Text.Encoding.UTF8))
            {
                try
                {
                    return AssembleDocument((string)input.templateFile, xmlData, (string)input.documentFile);
                }
                catch (XmlException e)
                {
                    e.Data.Add("xml", (string)input.xmlData);
                    throw e;
                }
            }
        }

        // assembly is synchronous, but when calling from Node.js (via Edge) we may still need an async method
        #pragma warning disable CS1998
        public async Task<object> AssembleDocumentAsync(dynamic input)
        {
            //await Task.Yield();
            return AssembleDocument(input);
        }
        #pragma warning restore CS1998

    }
}
