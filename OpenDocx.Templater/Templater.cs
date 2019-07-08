/***************************************************************************

Copyright (c) Lowell Stewart 2018-2019.
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
    public class Templater
    {
        public CompileResult CompileTemplate(string originalTemplateFile, string preProcessedTemplateFile, string parsedFieldInfoFile)
        {
            string json = File.ReadAllText(parsedFieldInfoFile);
            var xm = JsonConvert.DeserializeObject<FieldTransformIndex>(json);
            return TransformTemplate(originalTemplateFile, preProcessedTemplateFile, xm);
        }

        public async Task<object> CompileTemplateAsync(dynamic input)
        {
            var templateFile = (string)input.templateFile;
            var originalTemplate = (string)input.originalTemplateFile;
            var fieldInfoFileName = (string)input.fieldInfoFile;
            return CompileTemplate(originalTemplate, templateFile, fieldInfoFileName);
        }

        private static CompileResult TransformTemplate(string originalTemplateFile, string preProcessedTemplateFile, FieldTransformIndex xm)
        {
            string newDocxFilename = originalTemplateFile + "gen.docx";
            WmlDocument templateDoc = new WmlDocument(preProcessedTemplateFile); // just reads the template's bytes into memory (that's all), read-only
            byte[] byteArray = templateDoc.DocumentByteArray;
            WmlDocument transformedTemplate = null;
            bool templateError = false;
            using (MemoryStream mem = new MemoryStream())
            {
                mem.Write(byteArray, 0, byteArray.Length); // copy template file (binary) into memory -- I guess so the template/file handle isn't held/locked?
                using (WordprocessingDocument wordDoc = WordprocessingDocument.Open(mem, true)) // read & parse that byte array into OXML document (also in memory)
                {
                    templateError = PrepareTemplate(wordDoc, xm);
                }
                transformedTemplate = new WmlDocument(newDocxFilename, mem.ToArray());
            }
            // save the output (even in the case of error, since error messages are in the file)
            transformedTemplate.Save();

            if (templateError)
            {
                Console.WriteLine("Errors in template.");
                Console.WriteLine("See {0} to determine the errors in the template.", transformedTemplate.FileName);
            }

            return new CompileResult(transformedTemplate.FileName, templateError);
        }

        private static bool PrepareTemplate(WordprocessingDocument wordDoc, FieldTransformIndex xm)
        {
            if (RevisionAccepter.HasTrackedRevisions(wordDoc))
                throw new FieldParseException("Invalid template - contains tracked revisions");

            SimplifyTemplateMarkup(wordDoc);

            var te = new TemplateError();
            foreach (var part in wordDoc.ContentParts())
            {
                PrepareTemplatePart(part, xm, te);
            }
            return te.HasError;
        }

        private static void PrepareTemplatePart(OpenXmlPart part, FieldTransformIndex xm, TemplateError te)
        {
            XDocument xDoc = part.GetXDocument();

            var xDocRoot = RemoveGoBackBookmarks(xDoc.Root);

            // content controls in cells can surround the W.tc element, so transform so that such content controls are within the cell content
            xDocRoot = (XElement)NormalizeContentControlsInCells(xDocRoot);

            // transform OpenDocx fields into temporary parsed metadata objects (??)
            xDocRoot = (XElement) ParseFields(xDocRoot, xm, te);

            // Repeat, EndRepeat, Conditional, EndConditional are allowed at run level, but only if there is a matching pair
            // if there is only one Repeat, EndRepeat, Conditional, EndConditional, then move to block level.
            // if there is a matching set, then is OK.
            xDocRoot = (XElement)ForceBlockLevelAsAppropriate(xDocRoot, te);

            NormalizeRepeatAndConditional(xDocRoot, te);

            // any EndRepeat, EndConditional that remain are orphans, so replace with an error
            ProcessOrphanEndRepeatEndConditional(xDocRoot, te);

            // finally, transform the metadata objects BACK into document content, but this time in DocxGen syntax!
            xDocRoot = (XElement)ContentReplacementTransform(xDocRoot, xm, te);

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

        // this class must match (exactly) what's defined in OpenXmlPowerTools
        private class PA
        {
            public static readonly XName Content = "Content";
            public static readonly XName Table = "Table";
            public static readonly XName Repeat = "Repeat";
            public static readonly XName EndRepeat = "EndRepeat";
            public static readonly XName Conditional = "Conditional";
            public static readonly XName EndConditional = "EndConditional";

            public static readonly XName Select = "Select";
            public static readonly XName Optional = "Optional";
            public static readonly XName Match = "Match";
            public static readonly XName NotMatch = "NotMatch";
            public static readonly XName Depth = "Depth";
        }

        internal class OD // we may not need this class (here)... it's now out in the node.js code
        {
            public static readonly XName Content = "Content";
            public static readonly XName List = "List";
            public static readonly XName EndList = "EndList";
            public static readonly XName If = "If";
            public static readonly XName ElseIf = "ElseIf";
            public static readonly XName Else = "Else";
            public static readonly XName EndIf = "EndIf";

            public static readonly XName Expr = "expr";
            public static readonly XName Depth = "depth";
            public static readonly XName Id = "id";
        }

        private static object ParseFields(XNode node, FieldTransformIndex xm, TemplateError te)
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
                        if (!string.IsNullOrEmpty(tag) && xm.TryGetValue(tag, out var fieldInfo))
                        {
                            XElement xml = new XElement(fieldInfo.fieldType, new XAttribute(OD.Id, tag));
                            xml.Add(element.Elements(W.sdtContent).Elements());
                            return xml;
                        }
                    }
                }
                return new XElement(element.Name,
                    element.Attributes(),
                    element.Nodes().Select(n => ParseFields(n, xm, te)));
            }
            return node;
        }

        private static XName[] s_MetaToForceToBlock = new XName[] {
            OD.If,
            OD.ElseIf,
            OD.Else,
            OD.EndIf,
            OD.List,
            OD.EndList
        };

        private static object ForceBlockLevelAsAppropriate(XNode node, TemplateError te)
        {
            XElement element = node as XElement;
            if (element != null)
            {
                if (element.Name == W.p)
                {
                    var childMeta = element.Elements().Where(n => s_MetaToForceToBlock.Contains(n.Name)).ToList();
                    if (childMeta.Count() == 1)
                    {
                        var child = childMeta.First();
                        var otherTextInParagraph = element.Elements(W.r).Elements(W.t).Select(t => (string)t).StringConcatenate().Trim();
                        if (otherTextInParagraph != "")
                        {
                            var newPara = new XElement(element);
                            var newMeta = newPara.Elements().Where(n => s_MetaToForceToBlock.Contains(n.Name)).First();
                            newMeta.ReplaceWith(CreateRunErrorMessage("Error: Unmatched metadata can't be in paragraph with other text", te));
                            return newPara;
                        }
                        // force single metadata up to block level
                        var meta = new XElement(child.Name,
                            child.Attributes(),
                            new XElement(W.p,
                                element.Attributes(),
                                element.Elements(W.pPr),
                                child.Elements()));
                        return meta;
                    }
                    // check for proper nesting of run-level metadata
                    var stack = new Stack<XName>();
                    foreach (var c in childMeta)
                    {
                        if (c.Name == OD.List)
                        {
                            stack.Push(c.Name);
                        }
                        else if (c.Name == OD.EndList)
                        {
                            if (stack.Pop() != OD.List)
                                return CreateContextErrorMessage(element, "Error: Mismatch Repeat / EndRepeat at run level", te);
                        }
                        else if (c.Name == OD.If)
                        {
                            stack.Push(c.Name);
                        }
                        else if (c.Name == OD.ElseIf)
                        {
                            if (stack.Peek() != OD.If)
                                return CreateContextErrorMessage(element, "Error: ElseConditional outside of Conditional at run level", te);
                        }
                        else if (c.Name == OD.Else)
                        {
                            if (stack.Peek() != OD.If)
                                return CreateContextErrorMessage(element, "Error: Else outside of Conditional at run level", te);
                        }
                        else if (c.Name == OD.EndIf)
                        {
                            if (stack.Pop() != OD.If)
                                return CreateContextErrorMessage(element, "Error: Mismatch Conditional / EndConditional at run level", te);
                        }
                    }
                    return new XElement(element.Name,
                        element.Attributes(),
                        element.Nodes().Select(n => ForceBlockLevelAsAppropriate(n, te)));
                }
                return new XElement(element.Name,
                    element.Attributes(),
                    element.Nodes().Select(n => ForceBlockLevelAsAppropriate(n, te)));
            }
            return node;
        }

        // The following method is written using tree modification, not RPFT, because it is easier to write in this fashion.
        // These types of operations are not as easy to write using RPFT.
        // Unless you are completely clear on the semantics of LINQ to XML DML, do not make modifications to this method.
        private static void NormalizeRepeatAndConditional(XElement xDoc, TemplateError te)
        {
            int repeatDepth = 0;
            int conditionalDepth = 0;
            foreach (var metadata in xDoc.Descendants().Where(d =>
                    d.Name == OD.List ||
                    d.Name == OD.EndList ||
                    d.Name == OD.If ||
                    d.Name == OD.ElseIf ||
                    d.Name == OD.Else ||
                    d.Name == OD.EndIf))
            {
                if (metadata.Name == OD.List)
                {
                    ++repeatDepth;
                    metadata.Add(new XAttribute(OD.Depth, repeatDepth));
                    continue;
                }
                if (metadata.Name == OD.EndList)
                {
                    metadata.Add(new XAttribute(OD.Depth, repeatDepth));
                    --repeatDepth;
                    continue;
                }
                if (metadata.Name == OD.If)
                {
                    ++conditionalDepth;
                    metadata.Add(new XAttribute(OD.Depth, conditionalDepth));
                    continue;
                }
                if (metadata.Name == OD.ElseIf)
                {
                    metadata.Add(new XAttribute(OD.Depth, conditionalDepth));
                    continue;
                }
                if (metadata.Name == OD.Else)
                {
                    metadata.Add(new XAttribute(OD.Depth, conditionalDepth));
                    continue;
                }
                if (metadata.Name == OD.EndIf)
                {
                    metadata.Add(new XAttribute(OD.Depth, conditionalDepth));
                    --conditionalDepth;
                    continue;
                }
            }

            while (true)
            {
                bool didReplace = false;
                foreach (var metadata in xDoc.Descendants().Where(d => (d.Name == OD.List || d.Name == OD.If) && d.Attribute(OD.Depth) != null).ToList())
                {
                    var depth = (int)metadata.Attribute(OD.Depth);
                    XName matchingEndName = null;
                    if (metadata.Name == OD.List)
                        matchingEndName = OD.EndList;
                    else if (metadata.Name == OD.If)
                        matchingEndName = OD.EndIf;
                    if (matchingEndName == null)
                        throw new FieldParseException("Internal error");
                    var matchingEnd = metadata.ElementsAfterSelf(matchingEndName).FirstOrDefault(end => { return (int)end.Attribute(OD.Depth) == depth; });
                    if (matchingEnd == null)
                    {
                        metadata.ReplaceWith(CreateParaErrorMessage(string.Format("{0} does not have matching {1}", metadata.Name.LocalName, matchingEndName.LocalName), te));
                        continue;
                    }
                    metadata.RemoveNodes(); // LS: are there any?? why would there be?
                    var contentBetween = metadata.ElementsAfterSelf().TakeWhile(after => after != matchingEnd).ToList();
                    foreach (var item in contentBetween)
                        item.Remove();
                    contentBetween = contentBetween.Where(n => n.Name != W.bookmarkStart && n.Name != W.bookmarkEnd).ToList(); // ignore bookmarks
                    //metadata.Add(contentBetween); // instead of adding all, add one-at-a-time, looking for "else ifs" and "elses", and making them nested parents of the appropriate content
                    var metadataParent = metadata;
                    foreach (var e in contentBetween)
                    {
                        metadataParent.Add(e);
                        if (((e.Name == OD.ElseIf) || (e.Name == OD.Else)) && ((int)e.Attribute(OD.Depth) == depth))
                        {
                            e.RemoveNodes(); // LS: are there any?? why would there be?
                            metadataParent = e;
                            e.Attributes(OD.Depth).Remove();
                        }
                    }
                    metadata.Attributes(OD.Depth).Remove();
                    matchingEnd.Remove();
                    didReplace = true;
                    break;
                }
                if (!didReplace)
                    break;
            }
        }

        private static void ProcessOrphanEndRepeatEndConditional(XElement xDocRoot, TemplateError te)
        {
            foreach (var element in xDocRoot.Descendants(OD.EndList).ToList())
            {
                var error = CreateContextErrorMessage(element, "Error: endlist without matching list", te);
                element.ReplaceWith(error);
            }
            foreach (var element in xDocRoot.Descendants(OD.EndIf).ToList())
            {
                var error = CreateContextErrorMessage(element, "Error: endif without matching if", te);
                element.ReplaceWith(error);
            }
        }

        private class TemplateError
        {
            public bool HasError = false;
        }

        private static void SimplifyTemplateMarkup(WordprocessingDocument wordDoc)
        {
            // strip down the template to eliminate unnecessary work
            SimplifyMarkupSettings settings = new SimplifyMarkupSettings
            {
                RemoveComments = true,
                RemoveContentControls = false,
                RemoveEndAndFootNotes = false,
                RemoveFieldCodes = false,
                RemoveLastRenderedPageBreak = false,
                RemovePermissions = false,
                RemoveProof = true,
                RemoveRsidInfo = true,
                RemoveSmartTags = true,
                RemoveSoftHyphens = false,
                ReplaceTabsWithSpaces = false,
                RemoveMarkupForDocumentComparison = true,
                RemoveWebHidden = true
            };
            MarkupSimplifier.SimplifyMarkup(wordDoc, settings);
        }

        private static object CreateContextErrorMessage(XElement element, string errorMessage, TemplateError templateError)
        {
            XElement para = element.Descendants(W.p).FirstOrDefault();
            XElement run = element.Descendants(W.r).FirstOrDefault();
            var errorRun = CreateRunErrorMessage(errorMessage, templateError);
            if (para != null)
                return new XElement(W.p, errorRun);
            else
                return errorRun;
        }

        private static XElement CreateRunErrorMessage(string errorMessage, TemplateError templateError)
        {
            templateError.HasError = true;
            var errorRun = new XElement(W.r,
                new XElement(W.rPr,
                    new XElement(W.color, new XAttribute(W.val, "FF0000")),
                    new XElement(W.highlight, new XAttribute(W.val, "yellow"))),
                    new XElement(W.t, errorMessage));
            return errorRun;
        }

        private static XElement CreateParaErrorMessage(string errorMessage, TemplateError templateError)
        {
            templateError.HasError = true;
            var errorPara = new XElement(W.p,
                new XElement(W.r,
                    new XElement(W.rPr,
                        new XElement(W.color, new XAttribute(W.val, "FF0000")),
                        new XElement(W.highlight, new XAttribute(W.val, "yellow"))),
                        new XElement(W.t, errorMessage)));
            return errorPara;
        }

        static XElement CCWrap(params object[] content) => new XElement(W.sdt, new XElement(W.sdtContent, content));

        static XElement PWrap(params object[] content) => new XElement(W.p, content);

        static object ContentReplacementTransform(XNode node, FieldTransformIndex xm, TemplateError templateError)
        {
            XElement element = node as XElement;
            if (element != null)
            {
                if (element.Name == OD.Content)
                {
                    var selector = "./" + xm[element.Attribute(OD.Id).Value].atomizedExpr;
                    var fieldText = "<" + PA.Content + " "
                        + PA.Select + "=\"" + selector + "\" "
                        + PA.Optional + "=\"true\"/>";
                    XElement ccc = null;
                    XElement para = element.Descendants(W.p).FirstOrDefault();
                    XElement run = element.Descendants(W.r).FirstOrDefault();
                    if (para != null)
                    {
                        XElement pPr = para.Elements(W.pPr).FirstOrDefault();
                        XElement rPr = pPr?.Elements(W.rPr).FirstOrDefault();
                        XElement r = new XElement(W.r, rPr, new XElement(W.t, fieldText));
                        ccc = PWrap(para.Elements(W.pPr), r);
                    }
                    else
                    {
                        ccc = new XElement(W.r, new XElement(W.t, fieldText));
                    }
                    return CCWrap(ccc);
                }
                if (element.Name == OD.List)
                {
                    var listAtom = xm[element.Attribute(OD.Id).Value].atomizedExpr;
                    var puncAtom = listAtom + "1";
                    var selector = "./" + listAtom + "/" + listAtom + "0";
                    var puncSelector = "./" + puncAtom;
                    var startText = "<" + PA.Repeat + " "
                        + PA.Select + "=\"" + selector + "\" "
                        + PA.Optional + "=\"true\"/>";
                    var puncText = "<" + PA.Content + " "
                        + PA.Select + "=\"" + puncSelector + "\" "
                        + PA.Optional + "=\"true\"/>";
                    var endText = "<" + PA.EndRepeat + "/>";
                    XElement para = element.Descendants(W.p).FirstOrDefault();
                    var repeatingContent = element
                        .Elements()
                        .Select(e => ContentReplacementTransform(e, xm, templateError))
                        .ToList();
                    XElement startElem = new XElement(W.r, new XElement(W.t, startText));
                    XElement puncElem = new XElement(W.r, new XElement(W.t, puncText));
                    XElement endElem = new XElement(W.r, new XElement(W.t, endText));
                    if (para != null) // block-level list
                    {
                        // append list punctuation to end of last paragraph of repeating content
                        XElement lastPara = FindLastParagraphInRepeatingContentArray(repeatingContent);
                        if (lastPara != null)
                        {
                            lastPara.Add(CCWrap(puncElem));
                        }
                        // now prefix and suffix repeating content with block-level repeat elements/tags
                        repeatingContent.Insert(0, CCWrap(PWrap(startElem)));
                        // repeatingContent here
                        repeatingContent.Add(CCWrap(PWrap(endElem)));
                    }
                    else // run-level
                    {
                        repeatingContent.Insert(0, CCWrap(startElem));
                        // repeatingContent here
                        repeatingContent.Add(CCWrap(puncElem));
                        repeatingContent.Add(CCWrap(endElem));
                    }
                    return repeatingContent;
                }
                if (element.Name == OD.If || element.Name == OD.ElseIf || element.Name == OD.Else)
                {
                    var endText = "<" + PA.EndConditional + "/>";
                    XElement endElem = new XElement(W.r, new XElement(W.t, endText));
                    bool blockLevel = element.Descendants(W.p).FirstOrDefault() != null;
                    if (element.Name == OD.If)
                    {
                        var selector = xm[element.Attribute(OD.Id).Value].atomizedExpr;
                        var startText = "<" + PA.Conditional + " "
                            + PA.Select + "=\"" + selector + "\" "
                            + PA.Match + "=\"true\"/>";
                        var content = element
                            .Elements()
                            .Select(e => ContentReplacementTransform(e, xm, templateError))
                            .ToList();
                        XElement startElem = new XElement(W.r, new XElement(W.t, startText));
                        if (blockLevel)
                        {
                            content.Insert(0, CCWrap(PWrap(startElem)));
                            // content here
                            content.Add(CCWrap(PWrap(endElem)));
                        }
                        else // run-level
                        {
                            content.Insert(0, CCWrap(startElem));
                            // content here
                            content.Add(CCWrap(endElem));
                        }
                        return content;
                    }
                    if (element.Name == OD.ElseIf)
                    {
                        XElement lookUp = element.Parent;
                        while (lookUp.Name != OD.If && lookUp.Name != OD.ElseIf)
                            lookUp = lookUp.Parent;
                        var selector = xm[lookUp.Attribute(OD.Id).Value].atomizedExpr;
                        var startElseText = "<" + PA.Conditional + " "
                            + PA.Select + "=\"" + selector + "\" "
                            + PA.NotMatch + "=\"true\"/>"; // NotMatch instead of Match, represents "Else" branch
                        selector = xm[element.Attribute(OD.Id).Value].atomizedExpr;
                        var nestedIfText = "<" + PA.Conditional + " "
                            + PA.Select + "=\"" + selector + "\" "
                            + PA.Match + "=\"true\"/>";
                        var content = element
                            .Elements()
                            .Select(e => ContentReplacementTransform(e, xm, templateError))
                            .ToList();
                        XElement startElseElem = new XElement(W.r, new XElement(W.t, startElseText));
                        XElement nestedIfElem = new XElement(W.r, new XElement(W.t, nestedIfText));
                        if (blockLevel) // block-level conditional
                        {
                            content.Insert(0, CCWrap(PWrap(endElem)));
                            content.Insert(1, CCWrap(PWrap(startElseElem)));
                            content.Insert(2, CCWrap(PWrap(nestedIfElem)));
                            // content here
                            content.Add(CCWrap(PWrap(endElem)));
                        }
                        else // run-level
                        {
                            content.Insert(0, CCWrap(endElem));
                            content.Insert(1, CCWrap(startElseElem));
                            content.Insert(2, CCWrap(nestedIfElem));
                            // content here
                            content.Add(CCWrap(endElem));
                        }
                        // no "end" tag for the "else" branch, because the end is inserted by the If element after all its contents
                        return content;

                    }
                    if (element.Name == OD.Else)
                    {
                        XElement lookUp = element.Parent;
                        while (lookUp.Name != OD.If && lookUp.Name != OD.ElseIf)
                            lookUp = lookUp.Parent;
                        var selector = xm[lookUp.Attribute(OD.Id).Value].atomizedExpr;
                        var startElseText = "<" + PA.Conditional + " "
                            + PA.Select + "=\"" + selector + "\" "
                            + PA.NotMatch + "=\"true\"/>"; // NotMatch instead of Match, represents "Else" branch

                        var content = element
                            .Elements()
                            .Select(e => ContentReplacementTransform(e, xm, templateError))
                            .ToList();
                        XElement startElseElem = new XElement(W.r, new XElement(W.t, startElseText));
                        if (blockLevel) // block-level conditional
                        {
                            content.Insert(0, CCWrap(PWrap(endElem)));
                            content.Insert(1, CCWrap(PWrap(startElseElem)));
                        }
                        else // run-level
                        {
                            content.Insert(0, CCWrap(endElem));
                            content.Insert(1, CCWrap(startElseElem));
                        }
                        // no "end" tag for the "else" branch, because the end is inserted by the If element after all its contents
                        return content;
                    }
                }
                return new XElement(element.Name,
                    element.Attributes(),
                    element.Nodes().Select(n => ContentReplacementTransform(n, xm, templateError)));
            }
            return node;
        }

        static XElement FindLastParagraphInRepeatingContentArray(List<object> repeatingContent)
        {
            XElement result = null;
            int i = repeatingContent.Count - 1;
            while (result == null && i >= 0)
            {
                object item = repeatingContent[i];
                XElement el = item as XElement;
                if (el != null )
                {
                    result = el.DescendantsAndSelf(W.p).LastOrDefault();
                }
                else if (item is List<object>) // item is a nested block -- nested repeat (or conditional?)
                {
                    // we don't recurse because there's no appropriate place to put closing repeat punctuation in this case.
                    //result = FindLastParagraphInRepeatingContentArray((List<object>)item);
                    break;
                }
                i--;
            }
            return result;
        }
    }
}
