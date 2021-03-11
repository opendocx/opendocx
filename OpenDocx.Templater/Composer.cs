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
using OpenXmlPowerTools;
using System.Collections.Generic;

namespace OpenDocx
{
    public class Composer
    {
        public AssembleResult ComposeDocument(string outputFile, List<Source> sources)
        {
            var composedDoc = DocumentBuilder.BuildDocument(sources);
            if (!string.IsNullOrEmpty(outputFile))
            {
                //// save the output (even in the case of error, since error messages are in the file)
                composedDoc.SaveAs(outputFile);
                return new AssembleResult(outputFile, false);
            }
            else
            {
                return new AssembleResult(composedDoc.DocumentByteArray, false);
            }
        }

        // when calling from Node.js via Edge, we only get to pass one parameter
        public object ComposeDocument(dynamic input)
        {
            // input is an object containing (1) input.documentFile, a string, and (2) input.sources, an array of objects,
            // where each object has (1) a unique ID, and (2) an array of bytes consisting of its contents
            var documentFile = (string)input.documentFile;
            var rawSources = (object[])input.sources;
            if (rawSources == null || rawSources.Length == 0)
            {
                throw new ArgumentException("Invalid sources argument supplied to ComposeDocument");
            }
            List<Source> sources = new List<Source>(rawSources.Select(rawSource => {
                var sourceObj = (IDictionary<string, object>)rawSource;
                var id = (string)sourceObj["id"];
                var bytes = (byte[])sourceObj["buffer"];
                var doc = new WmlDocument(new OpenXmlPowerToolsDocument(bytes));
                return string.IsNullOrWhiteSpace(id)
                    ? new Source(doc, true)
                    : new Source(doc, id);
            }));
            return ComposeDocument(documentFile, sources);
        }

        // assembly is synchronous, but when calling from Node.js (via Edge) we may still need an async method
#pragma warning disable CS1998
        public async Task<object> ComposeDocumentAsync(dynamic input)
        {
            await Task.Yield();
            return ComposeDocument(input);
        }
#pragma warning restore CS1998

    }
}
