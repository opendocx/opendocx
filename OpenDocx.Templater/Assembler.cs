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
using System.Linq;
using System.Xml;
using System.Xml.Linq;
using System.Collections.Generic;
using OpenXmlPowerTools;

namespace OpenDocx;

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

    public async Task<AssembleResult> AssembleDocAsync(
        string templateFile, XElement data, string outputFile, List<Source> sources)
    {
        if (!File.Exists(templateFile))
            throw new FileNotFoundException("Template not found in the expected location", templateFile);
        WmlDocument templateDoc = new WmlDocument(templateFile); // reads the template's bytes into memory
        WmlDocument wmlAssembledDoc = await DocumentComposer.ComposeDocument(templateDoc, data, sources);
        if (!string.IsNullOrEmpty(outputFile))
        {
            //// save the output (even in the case of error, since error messages are in the file)
            wmlAssembledDoc.SaveAs(outputFile);
            return new AssembleResult(outputFile, false);
        }
        else
        {
            return new AssembleResult(wmlAssembledDoc.DocumentByteArray, false);
        }
    }

    // when calling from Node.js via Edge, we only get to pass one parameter
    public async Task<object> AssembleDocumentAsync(dynamic input)
    {
        var inputDict = (IDictionary<string, object>)input;
        var xmlData = inputDict.ContainsKey("xmlData") ? (string)inputDict["xmlData"] : null;
        var templateFile = (string)input.templateFile;
        var documentFile = (string)input.documentFile;
        List<Source> sources = null;
        var rawSources = inputDict.ContainsKey("sources") ? (object[])inputDict["sources"] : null;
        if (rawSources != null)
        {
            sources = new List<Source>(rawSources.Select(rawSource => {
                var sourceObj = (IDictionary<string, object>)rawSource;
                var id = (string)sourceObj["id"];
                var bytes = (byte[])sourceObj["buffer"];
                var doc = new WmlDocument(new OpenXmlPowerToolsDocument(bytes));
                var keepSections = (bool)sourceObj["keepSections"];
                var source = new Source(doc, id);
                if (keepSections) {
                    source.KeepSections = true;
                }
                return source;
            }));
        }
        using (var xmlReader = new StringReader(xmlData))
        try
        {
            return await AssembleDocAsync(templateFile, XElement.Load(xmlReader), documentFile, sources);
        }
        catch (XmlException e)
        {
            e.Data.Add("xml", xmlData);
            throw e;
        }
    }
}
