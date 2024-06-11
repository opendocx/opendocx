/***************************************************************************

Copyright (c) Lowell Stewart 2019-2023.
Licensed under the Mozilla Public License. See LICENSE file in the project root for full license information.

Published at https://github.com/opendocx/opendocx
Developer: Lowell Stewart
Email: lowell@opendocx.com

Uses a Recursive Pure Functional Transform (RPFT) approach to process a DOCX file and extract "field" metadata.
"Fields" may be either in regular text runs (delimited by special characters) or in content controls,
or any mixture thereof.

In the process, fields are all normalized so they are uniformly contained in content controls.
The process produces generic JSON metadata about all fields thus located, which includes depth indicators
so matching begin/end fields can be detected/enforced.

General RPFT approach was adapted from the Open XML Power Tools project. Those parts may contain...
  Portions Copyright (c) Microsoft. All rights reserved.
  Portions Copyright (c) Eric White Inc. All rights reserved.

***************************************************************************/
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.IO;
using System.Linq;
using System.Xml.Linq;
using OpenXmlPowerTools;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using DocumentFormat.OpenXml.CustomProperties;

namespace OpenDocx
{
    public class FieldExtractor
    {
        #pragma warning disable CS1998
        public async Task<object> ExtractFieldsAsync(dynamic input)
        {
            var templateFile = (string)input.templateFile;
            string fieldDelimiters = null;
            bool removeCustomProperties = true;
            object[] keepPropertyNames = null;
            var inputObj = (IDictionary<string, object>) input;
            if (inputObj.ContainsKey("fieldDelimiters")) {
                fieldDelimiters = (string)inputObj["fieldDelimiters"];
            }
            if (inputObj.ContainsKey("removeCustomProperties")) {
                removeCustomProperties = (bool) inputObj["removeCustomProperties"];
            }
            if (inputObj.ContainsKey("keepPropertyNames")) {
                keepPropertyNames = (object[]) inputObj["keepPropertyNames"];
            }
            await Task.Yield();
            return ExtractFields(templateFile, removeCustomProperties,
                keepPropertyNames?.Select(o => (string)o), fieldDelimiters);
        }
        #pragma warning restore CS1998

        public static FieldExtractResult ExtractFields(string templateFileName,
            bool removeCustomProperties = true, IEnumerable<string> keepPropertyNames = null,
            string fieldDelimiters = null)
        {
            string newTemplateFileName = templateFileName + "obj.docx";
            string outputFile = templateFileName + "obj.json";
            WmlDocument templateDoc = new WmlDocument(templateFileName); // just reads the template's bytes into memory (that's all), read-only

            var result = NormalizeTemplate(templateDoc.DocumentByteArray, removeCustomProperties, keepPropertyNames, fieldDelimiters);
            // save the output (even in the case of error, since error messages are in the file)
            var preprocessedTemplate = new WmlDocument(newTemplateFileName, result.NormalizedTemplate);
            preprocessedTemplate.Save();
            // also save extracted fields
            File.WriteAllText(outputFile, result.ExtractedFields);
            return new FieldExtractResult(newTemplateFileName, outputFile);
        }

        public static NormalizeResult NormalizeTemplate(byte[] templateBytes, bool removeCustomProperties = true,
            IEnumerable<string> keepPropertyNames = null, string fieldDelimiters = null)
        {
            var fieldAccumulator = new FieldAccumulator();
            var recognizer = FieldRecognizer.Default;
            OpenSettings openSettings = new OpenSettings();
            if (!string.IsNullOrWhiteSpace(fieldDelimiters)) {
                recognizer = new FieldRecognizer(fieldDelimiters, null);
                // commented out, because this causes corruption in some templates??
                // openSettings.MarkupCompatibilityProcessSettings =
                //     new MarkupCompatibilityProcessSettings(
                //         MarkupCompatibilityProcessMode.ProcessAllParts, 
                //         DocumentFormat.OpenXml.FileFormatVersions.Office2019);
            }
            using (MemoryStream mem = new MemoryStream())
            {
                mem.Write(templateBytes, 0, templateBytes.Length); // copy template bytes into memory stream
                using (WordprocessingDocument wordDoc = WordprocessingDocument.Open(mem, true, openSettings)) // read & parse that byte array into OXML document (also in memory)
                {
                    // first, remove all the task panes / web extension parts from the template (if there are any)
                    wordDoc.DeleteParts<WebExTaskpanesPart>(wordDoc.GetPartsOfType<WebExTaskpanesPart>());
                    // next, extract all fields (and thus logic) from the template's content parts
                    ExtractAllTemplateFields(wordDoc, recognizer, fieldAccumulator, false,
                        removeCustomProperties, keepPropertyNames);
                }
                using (var sw = new StringWriter())
                {
                    fieldAccumulator.JsonSerialize(sw);
                    return new NormalizeResult(mem.ToArray(), sw.ToString());
                }
            }
        }

        public static string ExtractFieldsOnly(byte[] docxBytes, string fieldDelimiters = null)
        {
            var fieldAccumulator = new FieldAccumulator();
            var recognizer = FieldRecognizer.Default;
            OpenSettings openSettings = new OpenSettings();
            if (!string.IsNullOrWhiteSpace(fieldDelimiters))
            {
                recognizer = new FieldRecognizer(fieldDelimiters, null);
            }
            using (MemoryStream mem = new MemoryStream())
            {
                mem.Write(docxBytes, 0, docxBytes.Length); // copy template bytes into memory stream
                using (WordprocessingDocument wordDoc = WordprocessingDocument.Open(mem, true, openSettings)) // read & parse those bytes into OXML document (also in memory)
                {
                    // next, extract all fields (and thus logic) from the template's content parts
                    ExtractAllTemplateFields(wordDoc, recognizer, fieldAccumulator, false, false, null);
                }
            }
            using (var sw = new StringWriter())
            {
                fieldAccumulator.JsonSerialize(sw);
                return sw.ToString();
            }
        }

        private static void ExtractAllTemplateFields(WordprocessingDocument wordDoc, FieldRecognizer recognizer,
            FieldAccumulator fieldAccumulator, bool readFieldComments, bool removeCustomProperties = true,
            IEnumerable<string> keepPropertyNames = null)
        {
            if (RevisionAccepter.HasTrackedRevisions(wordDoc))
                throw new FieldParseException("Invalid template - contains tracked revisions");

            CommentReader comments = null;
            if (readFieldComments) {
                comments = new CommentReader(wordDoc);
            }

            // extract fields from each part of the document
            foreach (var part in wordDoc.ContentParts())
            {
                ExtractFieldsFromPart(part, recognizer, fieldAccumulator, comments);

                if (removeCustomProperties)
                {
                    // remove document variables and custom properties
                    // (in case they have any sensitive information that should not carry over to assembled documents!)
                    MainDocumentPart main = part as MainDocumentPart;
                    if (main != null)
                    {
                        var docVariables = main.DocumentSettingsPart.Settings.Descendants<DocumentVariables>();
                        foreach (DocumentVariables docVars in docVariables.ToList())
                        {
                            foreach (DocumentVariable docVar in docVars.ToList())
                            {
                                if (keepPropertyNames == null || !Enumerable.Contains<string>(keepPropertyNames, docVar.Name))
                                {
                                    docVar.Remove();
                                    //docVar.Name = "Id";
                                    //docVar.Val.Value = "123";
                                }
                            }
                        }
                    }
                }
            }
            if (removeCustomProperties)
            {
                // remove custom properties if there are any (custom properties are the new/non-legacy version of document variables)
                var custom = wordDoc.CustomFilePropertiesPart;
                if (custom != null)
                {
                    foreach (CustomDocumentProperty prop in custom.Properties.ToList())
                    {
                        if (keepPropertyNames == null || !Enumerable.Contains<string>(keepPropertyNames, prop.Name))
                        {
                            prop.Remove();
                            // string propName = prop.Name;
                            // string value = prop.VTLPWSTR.InnerText;
                        }
                    }
                }
            }
        }

        private static void ExtractFieldsFromPart(OpenXmlPart part, FieldRecognizer recognizer,
            FieldAccumulator fieldAccumulator, CommentReader comments)
        {
            XDocument xDoc = part.GetXDocument();
            fieldAccumulator.BeginBlock();
            var xDocRoot = (XElement)IdentifyAndNormalizeFields(xDoc.Root, recognizer, fieldAccumulator, comments);
            fieldAccumulator.EndBlock();
            xDoc.Elements().First().ReplaceWith(xDocRoot);
            part.PutXDocument();
        }

        private static int CountSubstring(string substring, string source)
        {
            int count = 0, n = 0;
            if (!string.IsNullOrEmpty(substring))
            {
                while ((n = source.IndexOf(substring, n, StringComparison.Ordinal)) != -1)
                {
                    n += substring.Length;
                    ++count;
                }
            }
            return count;
        }

        private static object IdentifyAndNormalizeFields(XNode node, FieldRecognizer recognizer,
            FieldAccumulator fieldAccumulator, CommentReader comments)
        {
            XElement element = node as XElement;
            if (element != null)
            {
                if (element.Name == W.sdt)
                {
                    var alias = (string)element.Elements(W.sdtPr).Elements(W.alias).Attributes(W.val).FirstOrDefault();
                    if (alias == null || alias == "")
                    {
                        var ccContents = element
                            .DescendantsTrimmed(W.txbxContent)
                            .Where(e => e.Name == W.t)
                            .Select(t => (string)t)
                            .StringConcatenate()
                            .CleanUpInvalidCharacters();
                        if (recognizer.IsField(ccContents, out ccContents))
                        {
                            //var isBlockLevel = element.Element(W.sdtContent).Elements(W.p).FirstOrDefault() != null;
                            var newCC = new XElement(element.Name, element.Attributes());
                            var props = element.Elements(W.sdtPr).FirstOrDefault();
                            if (props == null)
                                props = new XElement(W.sdtPr);
                            else
                                props.Remove();
                            newCC.Add(props);
                            var tagElem = props.Elements(W.tag).FirstOrDefault();
                            if (tagElem == null)
                            {
                                tagElem = new XElement(W.tag);
                                props.Add(tagElem);
                            }
                            if (comments != null) {
                                var commentRef = element.Descendants(W.commentReference).FirstOrDefault();
                                if (commentRef != null) {
                                    var idAttr = commentRef.Attribute(W.id)?.Value;
                                    if (idAttr != null && comments.TryGetValue(idAttr, out var comment)) {
                                        if (!string.IsNullOrEmpty(comment)) {
                                            ccContents += "@@@COMMENT@@@" + comment;
                                        }
                                    }
                                }
                            }
                            var fieldId = fieldAccumulator.AddField(ccContents);
                            tagElem.SetAttributeValue(W.val, fieldId);
                            newCC.Add(element.Nodes());
                            return newCC;
                        }
                        return new XElement(element.Name,
                            element.Attributes(),
                            element.Nodes().Select(n => IdentifyAndNormalizeFields(n, recognizer, fieldAccumulator, comments)));
                    }
                    return new XElement(element.Name,
                        element.Attributes(),
                        element.Nodes().Select(n => IdentifyAndNormalizeFields(n, recognizer, fieldAccumulator, comments)));
                }
                if (element.Name == W.p) {
                    var paraContents = element
                        .DescendantsTrimmed(W.txbxContent)
                        .Where(e => e.Name == W.t)
                        .Select(t => (string)t)
                        .StringConcatenate()
                        .Trim();
                    // single-field-in-paragraph optimization commented out while re-working logic below.
                    // TODO: is it worthwhile to adapt this?
                    // int occurances = string.IsNullOrEmpty(recognizer.EmbedBegin)
                    //     ? CountSubstring(recognizer.FieldBegin, paraContents)
                    //     : CountSubstring(recognizer.EmbedBegin, paraContents);
                    // if (occurances == 1
                    //     && paraContents.StartsWith(recognizer.CombinedBegin)
                    //     && paraContents.EndsWith(recognizer.CombinedEnd))
                    // {
                    //     var content = paraContents
                    //         .Substring(recognizer.EmbedBeginLength,
                    //                    paraContents.Length - recognizer.EmbedDelimLength)
                    //         .Trim();
                    //     if (recognizer.IsField(content, out content))
                    //     {
                    //         fieldAccumulator.BeginBlock();
                    //         var fieldId = fieldAccumulator.AddField(content);
                    //         fieldAccumulator.EndBlock();
                    //         var ppr = element.Elements(W.pPr).FirstOrDefault();
                    //         var rpr = (ppr != null) ? ppr.Elements(W.rPr).FirstOrDefault() : null;
                    //         XElement r = new XElement(W.r, rpr,
                    //             new XElement(W.t, '[' + content + ']'));
                    //         return new XElement(element.Name,
                    //             element.Attributes(),
                    //             element.Elements(W.pPr),
                    //             CCTWrap(fieldId, r)
                    //         );
                    //     }
                    //     // else fall through to (slower) case
                    // }
                    if (paraContents.Contains(recognizer.CombinedBegin)) {
                        // paragraph appears to contain at least one text-delimited field
                        var runReplacementInfo = new List<XElement>();
                        var placeholderText = Guid.NewGuid().ToString();
                        var r = recognizer.Regex;
                        // replace every text-delimited field in this paragraph with the same GUID, AND place the
                        // corresponding field content (embedded in a content control) into runReplacementInfo for now.
                        // (OpenXmlRegex does not support replacing with arbitary elements, only a single text run!)
                        var replacedCount = OpenXmlRegex.Replace(new[] { element }, r, placeholderText, (para, match) =>
                        {
                            var matchString = match.Value.Trim().Replace("\u0001",""); // unrecognized codes/elements returned as \u0001; strip these
                            var content = matchString.Substring(
                                    recognizer.EmbedBeginLength,
                                    matchString.Length - recognizer.EmbedDelimLength)
                                .CleanUpInvalidCharacters();
                            if (recognizer.IsField(content, out content))
                            {
                                // var fieldId = fieldAccumulator.AddField(content); // unnecessary -- see below
                                // (after text-based field is wrapped in content control here, logic below
                                // re-processes and enumerates the now-wrapped fields! But I have to wonder,
                                // is that re-processing necessary or just a leftover from some old hack?)
                                runReplacementInfo.Add(CCWrap(new XElement(W.r, new XElement(W.t,
                                    '[' + content + ']'))));
                                return true;
                            }
                            return false;
                        }, false);
                        if (replacedCount > 0) {
                            // text-delimited fields were replaced by a GUID.
                            // Now plug in the actual content control elements in the place of the GUIDs.
                            var newPara = new XElement(element);
                            foreach (var elem in runReplacementInfo)
                            {
                                var runToReplace = newPara.Descendants(W.r).FirstOrDefault(rn => rn.Value == placeholderText
                                                                                                 && rn.Parent.Name != OD.Content);
                                if (runToReplace == null)
                                    throw new InvalidOperationException("Internal error");
                                else
                                {
                                    var rpr = runToReplace.Elements(W.rPr).FirstOrDefault();
                                    if (rpr != null)
                                    {
                                        rpr.Remove();
                                        elem.Elements(W.sdtContent).First().Elements(W.r).First().AddFirst(rpr);
                                    }
                                    runToReplace.ReplaceWith(elem);
                                }
                            }
                            var coalescedParagraph = WordprocessingMLUtil.CoalesceAdjacentRunsWithIdenticalFormatting(newPara);
                            // now all the paragraph's text-delimited fields should have been normalized...
                            // re-process with default recognizer
                            fieldAccumulator.BeginBlock();
                            var transformedContent = IdentifyAndNormalizeFields(
                                coalescedParagraph, FieldRecognizer.Default, fieldAccumulator, comments);
                            fieldAccumulator.EndBlock();
                            return transformedContent;
                        }
                    }
                    // the paragraph did not contain any text-delimited fields, but we must still process
                    // its content because it may have content control-based fields!
                    fieldAccumulator.BeginBlock();
                    var transformedParaContent = element.Nodes()
                        .Select(n => IdentifyAndNormalizeFields(n, FieldRecognizer.Default, fieldAccumulator, comments))
                        .ToArray();
                    fieldAccumulator.EndBlock();
                    return new XElement(element.Name, element.Attributes(), transformedParaContent);
                }
                else if (element.Name == W.lastRenderedPageBreak) {
                    // documents assembled from templates will almost always change pagination, so remove Word's pagination hints
                    // (also because they're not handled cleanly by OXPT)
                    return null;
                }
                else if (element.Name == W.r) {
                    // we should not get here on any run INSIDE a field
                    var textInRun = element.Elements(W.t).Select(t => (string)t).StringConcatenate().Trim();
                    if (textInRun != "")
                    {
                        // apparently, spaces and non-text outside of a field will (in at least some cases?)
                        // get ignored in assembly, even for block-level if's, so we only note non-spaces.
                        fieldAccumulator.RegisterNonFieldContentInBlock();
                    }
                }

                return new XElement(element.Name,
                    element.Attributes(),
                    element.Nodes().Select(n => IdentifyAndNormalizeFields(n, recognizer, fieldAccumulator, comments)));
            }
            return node;
        }

        static XElement CCWrap(params object[] content) => new XElement(W.sdt, new XElement(W.sdtContent, content));
        static XElement CCTWrap(string tag, params object[] content) =>
            new XElement(W.sdt,
                new XElement(W.sdtPr,
                    new XElement(W.tag, new XAttribute(W.val, tag))
                ),
                new XElement(W.sdtContent, content)
            );
        static XElement PWrap(params object[] content) => new XElement(W.p, content);
    }

    public static class StringFixerUpper
    {
        public static string CleanUpInvalidCharacters(this string fieldText)
        {
            return fieldText.Trim()
                            .Replace('“', '"') // replace curly quotes with straight ones
                            .Replace('”', '"')
                            .Replace("\u200b", null) // remove zero-width spaces -- potentially inserted via Macro or Word add-in for purposes of allowing word wrap
                            .Replace("\u200c", null);
        }
    }
}
