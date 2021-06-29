/***************************************************************************

Copyright (c) Lowell Stewart 2021.
Licensed under the Mozilla Public License. See LICENSE file in the project root for full license information.

Published at https://github.com/opendocx/opendocx
Developer: Lowell Stewart
Email: lowell@opendocx.com

Portions Copyright (c) Microsoft. All rights reserved.
Portions Copyright (c) Eric White Inc. All rights reserved.

***************************************************************************/

using System;
using System.Collections.Generic;
using System.Dynamic;
using System.Threading.Tasks;
using System.IO;
using System.Text.RegularExpressions;
using System.Linq;
using System.Xml.Linq;
using OpenXmlPowerTools;
using DocumentFormat.OpenXml.Packaging;
using Newtonsoft.Json;

namespace OpenDocx
{
    public class CCRemover
    {
        public CompileResult RemoveCCs(string originalTemplateFile, string preProcessedTemplateFile)
        {
            return TransformTemplate(originalTemplateFile, preProcessedTemplateFile);
        }

        #pragma warning disable CS1998
        public async Task<object> RemoveCCsAsync(dynamic input)
        {
            var preProcessedTemplateFile = (string)input.templateFile;
            var originalTemplateFile = (string)input.originalTemplateFile;
            await Task.Yield();
            return RemoveCCs(originalTemplateFile, preProcessedTemplateFile);
        }
        #pragma warning restore CS1998

        private static CompileResult TransformTemplate(string originalTemplateFile, string preProcessedTemplateFile)
        {
            string newDocxFilename = originalTemplateFile + "ncc.docx";
            byte[] byteArray = File.ReadAllBytes(preProcessedTemplateFile);
            WmlDocument transformedTemplate = null;
            using (MemoryStream memStream = new MemoryStream())
            {
                memStream.Write(byteArray, 0, byteArray.Length); // copy the bytes into an expandable MemoryStream
                using (WordprocessingDocument wordDoc = WordprocessingDocument.Open(memStream, true)) // read & parse that memory stream into an editable OXML document (also in memory)
                {
                    PrepareTemplate(wordDoc);
                }
                transformedTemplate = new WmlDocument(newDocxFilename, memStream.ToArray());
            }
            // delete output file if it already exists (Save() below is supposed to always overwrite, but I just want to be sure)
            if (File.Exists(newDocxFilename)) {
                File.Delete(newDocxFilename);
            }
            // save the output (even in the case of error, since error messages are in the file)
            transformedTemplate.Save();

            return new CompileResult(transformedTemplate.FileName, null);
        }

        private static void PrepareTemplate(WordprocessingDocument wordDoc)
        {
            if (RevisionAccepter.HasTrackedRevisions(wordDoc))
                throw new FieldParseException("Invalid template - contains tracked revisions");

            SimplifyTemplateMarkup(wordDoc);

            foreach (var part in wordDoc.ContentParts())
            {
                PrepareTemplatePart(part);
            }
        }

        private static void PrepareTemplatePart(OpenXmlPart part)
        {
            XDocument xDoc = part.GetXDocument();

            var xDocRoot = RemoveGoBackBookmarks(xDoc.Root);

            // content controls in cells can surround the W.tc element, so transform so that such content controls are within the cell content
            xDocRoot = (XElement)NormalizeContentControlsInCells(xDocRoot);

            // transform OpenDocx fields into temporary parsed metadata objects (??)
            xDocRoot = (XElement) StripCCs(xDocRoot);

            xDoc.Elements().First().ReplaceWith(xDocRoot);
            part.PutXDocument();
        }

        private static XElement RemoveGoBackBookmarks(XElement xElement)
        {
            var cloneXDoc = new XElement(xElement);
            while (true)
            {
                var bm = cloneXDoc.DescendantsAndSelf(W.bookmarkStart).FirstOrDefault(b => (string)b.Attribute(W.name) == "_GoBack");
                if (bm == null)
                    break;
                var id = (string)bm.Attribute(W.id);
                var endBm = cloneXDoc.DescendantsAndSelf(W.bookmarkEnd).FirstOrDefault(b => (string)b.Attribute(W.id) == id);
                bm.Remove();
                endBm.Remove();
            }
            return cloneXDoc;
        }

        // this transform inverts content controls that surround W.tc elements.  After transforming, the W.tc will contain
        // the content control, which contains the paragraph content of the cell.
        private static object NormalizeContentControlsInCells(XNode node)
        {
            XElement element = node as XElement;
            if (element != null)
            {
                if (element.Name == W.sdt && element.Parent.Name == W.tr)
                {
                    var newCell = new XElement(W.tc,
                        element.Elements(W.tc).Elements(W.tcPr),
                        new XElement(W.sdt,
                            element.Elements(W.sdtPr),
                            element.Elements(W.sdtEndPr),
                            new XElement(W.sdtContent,
                                element.Elements(W.sdtContent).Elements(W.tc).Elements().Where(e => e.Name != W.tcPr))));
                    return newCell;
                }
                return new XElement(element.Name,
                    element.Attributes(),
                    element.Nodes().Select(n => NormalizeContentControlsInCells(n)));
            }
            return node;
        }

        private static object StripCCs(XNode node)
        {
            XElement element = node as XElement;
            if (element != null)
            {
                if (element.Name == W.sdt)
                {
                    var alias = (string)element.Elements(W.sdtPr).Elements(W.alias).Attributes(W.val).FirstOrDefault();
                    if (string.IsNullOrEmpty(alias))
                    {
                        var tag = (string)element.Elements(W.sdtPr).Elements(W.tag).Attributes(W.val).FirstOrDefault();
                        if (!string.IsNullOrEmpty(tag) && true /*xm.TryGetValue(tag, out var fieldInfo)*/)
                        {
                            var plainText = element.Value;
                            if (plainText.StartsWith('[') && plainText.EndsWith(']'))
                            {
                                var content = element.Elements(W.sdtContent);
                                var runProps = content.Descendants(W.rPr).FirstOrDefault();
                                return new XElement(W.r, runProps, new XElement(W.t, "=:" + tag + ":="));
                                // var firstText = content.Descendants(W.t).First();
                                // var lastText = content.Descendants(W.t).Last();
                                // return WrapInBraces(content.Nodes(), firstText, lastText);
                            }
                        }
                    }
                }
                return new XElement(element.Name,
                    element.Attributes(),
                    element.Nodes().Select(n => StripCCs(n)));
            }
            return node;
        }

        // private static object WrapInBraces(IEnumerable<XNode> nodes, XElement firstText, XElement lastText)
        // {
        //     return nodes.Select(node =>
        //     {
        //         XElement element = node as XElement;
        //         if (element != null)
        //         {
        //             if (element.Name == W.t)
        //             {
        //                 if (element == firstText)
        //                 {
        //                     var newText = "{" + element.Value;
        //                     if (element == lastText) // also last?
        //                     {
        //                         newText = newText + "}";
        //                     }
        //                     return new XElement(element.Name, element.Attributes(), newText);
        //                 }
        //                 if (element == lastText)
        //                 {
        //                     return new XElement(element.Name, element.Attributes(), element.Value + "}");
        //                 }
        //             }
        //             return new XElement(element.Name,
        //                 element.Attributes(),
        //                 WrapInBraces(element.Nodes(), firstText, lastText));
        //         }
        //         return node;
        //     });
        // }

        private static void SimplifyTemplateMarkup(WordprocessingDocument wordDoc)
        {
            // strip down the template to eliminate unnecessary work
            SimplifyMarkupSettings settings = new SimplifyMarkupSettings
            {
                RemoveComments = true,
                RemoveContentControls = false,
                RemoveEndAndFootNotes = false,
                RemoveFieldCodes = false,
                RemoveLastRenderedPageBreak = true,
                RemovePermissions = false,
                RemoveProof = true,
                RemoveRsidInfo = true,
                RemoveSmartTags = false, // todo: change this back to true once we have patched OXPT to make it work right
                RemoveSoftHyphens = false,
                ReplaceTabsWithSpaces = false,
                RemoveMarkupForDocumentComparison = true,
                RemoveWebHidden = true
            };
            MarkupSimplifier.SimplifyMarkup(wordDoc, settings);
        }
    }
}
