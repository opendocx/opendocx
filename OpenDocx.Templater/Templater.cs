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
using System.Threading;
using System.Threading.Tasks;
using System.IO;
using System.Text.RegularExpressions;
using System.Linq;
using System.Xml.Linq;
using OpenXmlPowerTools;
using DocumentFormat.OpenXml.Packaging;

namespace OpenDocx
{
    public class Templater
    {
        public async Task<object> AssembleAsync(dynamic input)
        {
            Console.WriteLine("DN: OpenDocx.Templater.AssembleAsync invoked");
            var documentFile = (string)input.documentFile;
            var templateFile = (string)input.templateFile;
            var xmlData = new StringReader((string)input.xmlData);
            if (!File.Exists(templateFile))
                throw new FileNotFoundException("Template not found in the expected location", templateFile);
            WmlDocument templateDoc = new WmlDocument(templateFile); // reads the template's bytes into memory
            CancellationTokenSource source = new CancellationTokenSource();
            Console.WriteLine("DN: reading xml");
            XElement data = await XElement.LoadAsync(xmlData, LoadOptions.None, source.Token);
            bool templateError;
            Console.WriteLine("DN: assembling");
            WmlDocument wmlAssembledDoc = DocumentAssembler.AssembleDocument(templateDoc, data, out templateError);
            if (templateError)
            {
                Console.WriteLine("Errors in template.");
                Console.WriteLine("See the assembled document to inspect errors.");
            }
            // todo: return the document somehow? instead of saving it.

            //// save the output (even in the case of error, since error messages are in the file)
            Console.WriteLine("DN: saving");
            wmlAssembledDoc.SaveAs(documentFile);
            Console.WriteLine("DN: OpenDocx.Templater.AssembleAsync wrote the result to " + documentFile);

            return new
            {
                DocumentFile = documentFile,
                HasErrors = templateError
            };
        }

        public async Task<object> CompileTemplateAsync(dynamic input)
        {
            //Console.WriteLine("DN: OpenDocx.Templater.CompileTemplateAsync invoked");
            var templateFile = (string)input.templateFile;
            var fieldParser = new AsyncFieldParser(input);
            WmlDocument templateDoc = new WmlDocument(templateFile); // just reads the template's bytes into memory (that's all), read-only

            var result = await CompileTemplateAsync(templateDoc, templateFile, fieldParser);
            if (result.HasErrors)
            {
                Console.WriteLine("Errors in template.");
                Console.WriteLine("See {0} to determine the errors in the template.", result.CompiledTemplate.FileName);
            }
            // save the output (even in the case of error, since error messages are in the file)
            result.CompiledTemplate.Save(); // write the in-memory copy out to disk

            return new
            {
                CompiledTemplateFile = result.CompiledTemplate.FileName,
                ExtractedLogicFile = result.ExtractedLogicFileName,
                result.HasErrors
            };
        }

        private static async Task<CompileResult> CompileTemplateAsync(WmlDocument templateDoc, string templateFileName, IAsyncFieldParser parser)
        {
            WmlDocument preprocessedTemplate = null;
            bool templateError = false;
            byte[] byteArray = templateDoc.DocumentByteArray;
            string jsFunction;
            using (MemoryStream mem = new MemoryStream())
            {
                mem.Write(byteArray, 0, (int)byteArray.Length); // copy template file (binary) into memory -- I guess so the template/file handle isn't held/locked?
                using (WordprocessingDocument wordDoc = WordprocessingDocument.Open(mem, true)) // read & parse that byte array into OXML document (also in memory)
                {
                    var translationMetadata = new TranslationMetadata("data");
                    templateError = await PrepareTemplateAsync(wordDoc, parser, translationMetadata);
                    jsFunction = translationMetadata.GetFunc();

                    // experimental: save a "normalized", plain text version of the template as Flat OPC, to see what it looks like at this point in processing
                    //string str = wordDoc.ToFlatOpcString();
                    //using (StreamWriter sw = File.CreateText(outputFilename + ".FlatOpc.xml"))
                    //{
                    //    sw.Write(str);
                    //    sw.Close();
                    //}
                    //// end experimental
                }
                preprocessedTemplate = new WmlDocument(templateFileName + ".docxgen.docx", mem.ToArray());
            }
            string jsFileName = templateFileName + ".js";
            using (StreamWriter sw = File.CreateText(jsFileName))
            {
                sw.Write(jsFunction);
                sw.Close();
            }

            return new CompileResult(preprocessedTemplate, jsFileName, templateError);
        }

        private static async Task<bool> PrepareTemplateAsync(WordprocessingDocument wordDoc, IAsyncFieldParser fieldParser, TranslationMetadata xm)
        {
            if (RevisionAccepter.HasTrackedRevisions(wordDoc))
                throw new FieldParseException("Invalid template - contains tracked revisions");

            SimplifyTemplateMarkup(wordDoc);

            var te = new TemplateError();
            var partTasks = wordDoc.ContentParts().Select(part => PrepareTemplatePartAsync(fieldParser, xm, te, part));
            await Task.WhenAll(partTasks);
            return te.HasError;
        }

        private static readonly object s_partLock = new object();

        private static async Task PrepareTemplatePartAsync(IAsyncFieldParser parser, TranslationMetadata xm, TemplateError te, OpenXmlPart part)
        {
            XDocument xDoc = part.GetXDocument();

            var xDocRoot = RemoveGoBackBookmarks(xDoc.Root);

            // content controls in cells can surround the W.tc element, so transform so that such content controls are within the cell content
            xDocRoot = (XElement)NormalizeContentControlsInCells(xDocRoot);

            // parse OpenDocx fields into metadata
            xDocRoot = (XElement) await ParseFieldsAsync(xDocRoot, parser, te);

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
            // work around apparent issues with thread safety when replacing the content of a part within a package
            lock (s_partLock)
            {
                part.PutXDocument();
            }
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

        internal class OD
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
        }

        private static async Task<object> ParseFieldsAsync(XNode node, IAsyncFieldParser parser, TemplateError te)
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
                            .Trim()
                            .Replace('“', '"')
                            .Replace('”', '"');
                        if (ccContents.StartsWith(parser.DelimiterOpen))
                        {
                            XElement xml = await TransformContentToMetadataAsync(te, ccContents, parser);
                            if (xml.Name == W.p || xml.Name == W.r)  // this means there was an error processing the XML.
                            {
                                if (element.Parent.Name == W.p)
                                    return xml.Elements(W.r);
                                return xml;
                            }
                            xml.Add(element.Elements(W.sdtContent).Elements());
                            return xml;
                        }
                        var contentNodeTasks = element.Nodes().Select(n => ParseFieldsAsync(n, parser, te));
                        return new XElement(element.Name,
                            element.Attributes(),
                            await Task.WhenAll(contentNodeTasks));
                    }
                    var otherContentNodeTasks = element.Nodes().Select(n => ParseFieldsAsync(n, parser, te));
                    return new XElement(element.Name,
                        element.Attributes(),
                        await Task.WhenAll(otherContentNodeTasks));
                }
                if (element.Name == W.p)
                {
                    var paraContents = element
                        .DescendantsTrimmed(W.txbxContent)
                        .Where(e => e.Name == W.t)
                        .Select(t => (string)t)
                        .StringConcatenate()
                        .Trim();
                    int occurances = paraContents.Select((c, i) => paraContents.Substring(i)).Count(sub => sub.StartsWith(parser.EmbedOpen));
                    if (paraContents.StartsWith(parser.EmbedOpen) && paraContents.EndsWith(parser.EmbedClose) && occurances == 1)
                    {
                        var content = paraContents.Substring(parser.EmbedOpen.Length, paraContents.Length - parser.EmbedOpen.Length - parser.EmbedClose.Length).Trim();
                        XElement xml = await TransformContentToMetadataAsync(te, content, parser);
                        if (xml.Name == W.p || xml.Name == W.r)
                            return xml;
                        xml.Add(element);
                        return xml;
                    }
                    if (paraContents.Contains(parser.EmbedOpen))
                    {
                        List<RunReplacementInfo> runReplacementInfo = new List<RunReplacementInfo>();
                        var thisGuid = Guid.NewGuid().ToString();
                        var r = new Regex(Regex.Escape(parser.EmbedOpen) + ".*?" + Regex.Escape(parser.EmbedClose));
                        XElement xml = null;
                        OpenXmlRegex.Replace(new[] { element }, r, thisGuid, (para, match) =>
                        {
                            var matchString = match.Value.Trim();
                            var content = matchString.Substring(
                                    parser.EmbedOpen.Length,
                                    matchString.Length - parser.EmbedOpen.Length - parser.EmbedClose.Length
                                ).Trim().Replace('“', '"').Replace('”', '"');
                            try
                            {
                                xml = parser.ParseField(content);
                            }
                            catch (FieldParseException e)
                            {
                                RunReplacementInfo rri = new RunReplacementInfo()
                                {
                                    Xml = null,
                                    ParseExceptionMessage = "ParseException: " + e.Message,
                                    SchemaValidationMessage = null,
                                };
                                runReplacementInfo.Add(rri);
                                return true;
                            }
                            RunReplacementInfo rri2 = new RunReplacementInfo()
                            {
                                Xml = xml,
                                ParseExceptionMessage = null,
                                SchemaValidationMessage = null,
                            };
                            runReplacementInfo.Add(rri2);
                            return true;
                        }, false);

                        var newPara = new XElement(element);
                        foreach (var rri in runReplacementInfo)
                        {
                            var runToReplace = newPara.Descendants(W.r).FirstOrDefault(rn => rn.Value == thisGuid && rn.Parent.Name != OD.Content);
                            if (runToReplace == null)
                                throw new FieldParseException("Internal error");
                            if (rri.ParseExceptionMessage != null)
                                runToReplace.ReplaceWith(CreateRunErrorMessage(rri.ParseExceptionMessage, te));
                            else if (rri.SchemaValidationMessage != null)
                                runToReplace.ReplaceWith(CreateRunErrorMessage(rri.SchemaValidationMessage, te));
                            else
                            {
                                var newXml = new XElement(rri.Xml);
                                newXml.Add(runToReplace);
                                runToReplace.ReplaceWith(newXml);
                            }
                        }
                        var coalescedParagraph = WordprocessingMLUtil.CoalesceAdjacentRunsWithIdenticalFormatting(newPara);
                        return coalescedParagraph;
                    }
                }

                var childNodeTasks = element.Nodes().Select(n => ParseFieldsAsync(n, parser, te));
                return new XElement(element.Name,
                    element.Attributes(),
                    await Task.WhenAll(childNodeTasks));
            }
            return node;
        }

        private static async Task<XElement> TransformContentToMetadataAsync(TemplateError te, string content, IAsyncFieldParser parser)
        {
            XElement xml;
            try
            {
                xml = await parser.ParseFieldAsync(content);
            }
            catch (FieldParseException e)
            {
                return CreateParaErrorMessage("ParseException: " + e.Message, te);
            }
            return xml;
        }

        private class RunReplacementInfo
        {
            public XElement Xml;
            public string ParseExceptionMessage;
            public string SchemaValidationMessage;
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
                RemoveProofingErrors = true,
                RemoveSuppressProofing = false,
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

        static object ContentReplacementTransform(XNode node, TranslationMetadata compiler, TemplateError templateError)
        {
            XElement element = node as XElement;
            if (element != null)
            {
                if (element.Name == OD.Content)
                {
                    var selector = compiler.DefineProperty(element.Attribute(OD.Expr).Value);
                    var text = "<" + DocumentAssembler.PA.Content + " "
                        + DocumentAssembler.PA.Select + "=\"" + selector + "\" "
                        + DocumentAssembler.PA.Optional + "=\"true\"/>";
                    XElement ccc = null;
                    XElement para = element.Descendants(W.p).FirstOrDefault();
                    XElement run = element.Descendants(W.r).FirstOrDefault();
                    if (para != null)
                    {
                        XElement r = new XElement(W.r,
                            para.Elements(W.pPr).FirstOrDefault().Elements(W.rPr).FirstOrDefault(),
                            new XElement(W.t, text));
                        ccc = PWrap(para.Elements(W.pPr), r);
                    }
                    else
                    {
                        ccc = new XElement(W.r, new XElement(W.t, text));
                    }
                    return CCWrap(ccc);
                }
                if (element.Name == OD.List)
                {
                    var selector = compiler.BeginList(element.Attribute(OD.Expr).Value);
                    var startText = "<" + DocumentAssembler.PA.Repeat + " "
                        + DocumentAssembler.PA.Select + "=\"" + selector + "\" "
                        + DocumentAssembler.PA.Optional + "=\"true\"/>";
                    var endText = "<" + DocumentAssembler.PA.EndRepeat + "/>";
                    XElement para = element.Descendants(W.p).FirstOrDefault();
                    var repeatingContent = element
                        .Elements()
                        .Select(e => ContentReplacementTransform(e, compiler, templateError))
                        .ToList();
                    compiler.EndList();
                    XElement startElem = new XElement(W.r, new XElement(W.t, startText));
                    XElement endElem = new XElement(W.r, new XElement(W.t, endText));
                    if (para != null) // block-level list
                    {
                        repeatingContent.Insert(0, CCWrap(PWrap(startElem)));
                        // repeatingContent here
                        repeatingContent.Add(CCWrap(PWrap(endElem)));
                    }
                    else // run-level
                    {
                        repeatingContent.Insert(0, CCWrap(startElem));
                        // repeatingContent here
                        repeatingContent.Add(CCWrap(endElem));
                    }
                    return repeatingContent;
                }
                if (element.Name == OD.If || element.Name == OD.ElseIf || element.Name == OD.Else)
                {
                    var endText = "<" + DocumentAssembler.PA.EndConditional + "/>";
                    XElement endElem = new XElement(W.r, new XElement(W.t, endText));
                    bool blockLevel = element.Descendants(W.p).FirstOrDefault() != null;
                    if (element.Name == OD.If)
                    {
                        var selector = compiler.BeginIf(element.Attribute(OD.Expr).Value);
                        var startText = "<" + DocumentAssembler.PA.Conditional + " "
                            + DocumentAssembler.PA.Select + "=\"" + selector + "\" "
                            + DocumentAssembler.PA.Match + "=\"true\"/>";
                        var content = element
                            .Elements()
                            .Select(e => ContentReplacementTransform(e, compiler, templateError))
                            .ToList();
                        compiler.EndIf();
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
                        var selector = compiler.Else();
                        var startElseText = "<" + DocumentAssembler.PA.Conditional + " "
                            + DocumentAssembler.PA.Select + "=\"" + selector + "\" "
                            + DocumentAssembler.PA.NotMatch + "=\"true\"/>"; // NotMatch instead of Match, represents "Else" branch
                        selector = compiler.BeginIf(element.Attribute(OD.Expr).Value);
                        var nestedIfText = "<" + DocumentAssembler.PA.Conditional + " "
                            + DocumentAssembler.PA.Select + "=\"" + selector + "\" "
                            + DocumentAssembler.PA.Match + "=\"true\"/>";
                        var content = element
                            .Elements()
                            .Select(e => ContentReplacementTransform(e, compiler, templateError))
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
                        var selector = compiler.Else();
                        var startElseText = "<" + DocumentAssembler.PA.Conditional + " "
                            + DocumentAssembler.PA.Select + "=\"" + selector + "\" "
                            + DocumentAssembler.PA.NotMatch + "=\"true\"/>"; // NotMatch instead of Match, represents "Else" branch

                        var content = element
                            .Elements()
                            .Select(e => ContentReplacementTransform(e, compiler, templateError))
                            .ToList();
                        XElement startElseElem = new XElement(W.r, new XElement(W.t, startElseText));
                        if (blockLevel) // block-level conditional
                        {
                            content.Insert(0, CCWrap(PWrap(endElem)));
                            content.Add(CCWrap(PWrap(startElseElem)));
                        }
                        else // run-level
                        {
                            content.Insert(0, CCWrap(endElem));
                            content.Add(CCWrap(startElseElem));
                        }
                        // no "end" tag for the "else" branch, because the end is inserted by the If element after all its contents
                        return content;
                    }
                }
                return new XElement(element.Name,
                    element.Attributes(),
                    element.Nodes().Select(n => ContentReplacementTransform(n, compiler, templateError)));
            }
            return node;
        }
    }
}
