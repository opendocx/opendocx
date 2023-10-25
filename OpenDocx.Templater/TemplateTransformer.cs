/***************************************************************************

Copyright (c) Lowell Stewart 2018-2023.
Licensed under the Mozilla Public License. See LICENSE file in the project root for full license information.

Published at https://github.com/opendocx/opendocx
Developer: Lowell Stewart
Email: lowell@opendocx.com

Uses a combination of Recursive Pure Functional Transform (RPFT) and tree modification
to facilitate various transformations of DOCX files. The general approach was adapted
from the Open XML Power Tools project. Those parts may contain...
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
using System.Diagnostics;

namespace OpenDocx
{
    public class TemplateTransformer {
        // #pragma warning disable CS1998
        // public async Task<object> TransformTemplateAsync(dynamic input)
        // {
        //     var preProcessedTemplateFile = (string)input.templateFile;
        //     var originalTemplateFile = (string)input.originalTemplateFile;
        //     TemplateFormat destinationFormat;
        //     if (!Enum.TryParse((string)input.destinationFormat, out destinationFormat)) {
        //         throw new ArgumentOutOfRangeException("destinationFormat");
        //     }
        //     IDictionary<string, string> fieldMap = null;
        //     var inputObj = (IDictionary<string, object>) input;
        //     if (inputObj.ContainsKey("fieldMap")) {
        //         fieldMap = (IDictionary<string, string>) inputObj["fieldMap"];
        //     }
        //     await Task.Yield();
        //     return TransformTemplate(originalTemplateFile, preProcessedTemplateFile, destinationFormat, fieldMap);
        // }
        // #pragma warning restore CS1998

        public static string[] TransformTemplate(string normalizedTemplatePath,
            string destinationTemplatePath, TemplateFormat destinationFormat, FieldReplacementIndex fieldMap,
            string commentAuthor = null, string commentInitials = null)
        {
            byte[] byteArray = File.ReadAllBytes(normalizedTemplatePath);
            WmlDocument transformedTemplate = null;
            TemplateErrorList templateErrors;
            using (MemoryStream memStream = new MemoryStream())
            {
                memStream.Write(byteArray, 0, byteArray.Length); // copy the bytes into an expandable MemoryStream
                using (WordprocessingDocument wordDoc = WordprocessingDocument.Open(memStream, true)) // read & parse that memory stream into an editable OXML document (also in memory)
                {
                    templateErrors = DoTemplateTransformation(wordDoc, destinationFormat, fieldMap,
                        commentAuthor, commentInitials);
                }
                transformedTemplate = new WmlDocument(destinationTemplatePath, memStream.ToArray());
            }
            // delete output file if it already exists (Save() below is supposed to always overwrite, but I just want to be sure)
            if (File.Exists(destinationTemplatePath)) {
                File.Delete(destinationTemplatePath);
            }
            // save the output (even in the case of error, since error messages are in the file)
            transformedTemplate.Save();
            return templateErrors.ErrorList.Select(e => e.ToString()).ToArray();
        }

        private static TemplateErrorList DoTemplateTransformation(WordprocessingDocument wordDoc,
            TemplateFormat destinationFormat, FieldReplacementIndex fieldMap,
            string commentAuthor, string commentInitials)
        {
            if (RevisionAccepter.HasTrackedRevisions(wordDoc))
                throw new FieldParseException("Invalid template - contains tracked revisions");

            SimplifyTemplateMarkup(wordDoc,
                destinationFormat == TemplateFormat.ObjectDocx ||
                destinationFormat == TemplateFormat.PreviewDocx);

            CommentAdder commenter = null;
            if ((destinationFormat == TemplateFormat.TextFieldSourceDocx || destinationFormat == TemplateFormat.ContentControlSourceDocx) && !string.IsNullOrEmpty(commentAuthor) && !string.IsNullOrEmpty(commentInitials)) {
                commenter = new CommentAdder(wordDoc, commentAuthor, commentInitials);
            }

            var te = new TemplateErrorList();
            foreach (var part in wordDoc.ContentParts())
            {
                // Console.WriteLine(part.RelationshipType);
                TransformTemplatePart(part, destinationFormat, fieldMap, commenter, te);
            }
            if (commenter != null) {
                commenter.SaveComments();
            }
            return te;
        }

        private static void TransformTemplatePart(OpenXmlPart part, TemplateFormat destinationFormat,
            FieldReplacementIndex fieldMap, CommentAdder comments, TemplateErrorList te)
        {
            XDocument xDoc = part.GetXDocument();

            var xDocRoot = RemoveGoBackBookmarks(xDoc.Root);

            // content controls in cells can surround the W.tc element, so transform so that such content controls are within the cell content
            xDocRoot = (XElement)NormalizeContentControlsInCells(xDocRoot);

            // transform fields from ContentControls with text runs to... (depending on destinationFormat...)
            // - actual custom XML elements (OD.*)
            xDocRoot = (XElement) ReplaceFields(xDocRoot, destinationFormat, fieldMap, comments, te);

            if (destinationFormat == TemplateFormat.ObjectDocx) {
                // Repeat, EndRepeat, Conditional, EndConditional are allowed at run level, but only if there is a matching pair
                // if there is only one Repeat, EndRepeat, Conditional, EndConditional, then move to block level.
                // if there is a matching set, then is OK.
                xDocRoot = (XElement)ForceBlockLevelAsAppropriate(xDocRoot, te);

                NormalizeRepeatAndConditional(xDocRoot, te);

                // any EndRepeat, EndConditional that remain are orphans, so replace with an error
                ProcessOrphanEndRepeatEndConditional(xDocRoot, te);

                // add placeholders for list punctuation
                xDocRoot = (XElement)AddListPunctuationPlaceholders(xDocRoot, te);

                // finally, transform the metadata objects BACK into document content, but this time in DocxGen syntax!
                xDocRoot = (XElement)ContentReplacementTransform(xDocRoot, fieldMap, te);
            }

            xDoc.Elements().First().ReplaceWith(xDocRoot);
            part.PutXDocument();
        }

        private static object ReplaceFields(XNode node, TemplateFormat destinationFormat,
            FieldReplacementIndex fieldMap, CommentAdder comments, TemplateErrorList te)
        {
            XElement element = node as XElement;
            if (element != null) {
                if (element.Name == W.sdt) {
                    var alias = (string)element.Elements(W.sdtPr).Elements(W.alias).Attributes(W.val).FirstOrDefault();
                    if (string.IsNullOrEmpty(alias)) {
                        var tag = (string)element.Elements(W.sdtPr).Elements(W.tag).Attributes(W.val).FirstOrDefault();
                        int tagVal = 0;
                        if (!string.IsNullOrEmpty(tag) && int.TryParse(tag, out tagVal)) {
                            var fieldContent = element.Elements(W.sdtContent);
                            var childPara = fieldContent.Elements(W.p).FirstOrDefault();
                            var pProps = childPara?.Elements(W.pPr).FirstOrDefault();
                            var firstRun = fieldContent.Descendants(W.r).FirstOrDefault();
                            var runProps = firstRun?.Elements(W.rPr).FirstOrDefault();
                            if (destinationFormat == TemplateFormat.PreviewDocx) {
                                // replace field content with flattened + delimited field IDs so they will be ignored by
                                // subsequent conversion from DOCX to Markdown (after which field content will be swapped back in)
                                var newRun = new XElement(W.r, runProps, new XElement(W.t, "=:" + tag + ":="));
                                if (childPara != null) {
                                    return PWrap(childPara.Attributes(), pProps, newRun);
                                } // else
                                return newRun;
                            }
                            // else transform the field into the requested output format...
                            // check to see if the field is being explicitly replaced, and throw if not
                            if (!fieldMap.TryGetValue(tag, out var replacement)) {
                                throw new ArgumentException("fieldMap specifies no replacement for field " + tag);
                            }
                            if (destinationFormat == TemplateFormat.ObjectDocx) {
                                // replace field with custom XML element that is tagged with field ID
                                XElement xml = new XElement(GetFieldType(replacement), new XAttribute(OD.Id, tag));
                                xml.Add(fieldContent.Elements());
                                return xml;
                            } else { // translate to source DOCX -- either content controls or text delimited fields
                                var sourceField = new SourceField(replacement, comments);
                                if (destinationFormat == TemplateFormat.ContentControlSourceDocx) {
                                    var runList = sourceField.GetContentRunsWithDelim("[", "]", runProps).ToList();
                                    if (childPara != null) {
                                        return CCWrap(PWrap(childPara.Attributes(), pProps, runList));
                                    } // else
                                    return CCWrap(runList);
                                } else { // destinationFormat == TemplateFormat.TextFieldSourceDocx
                                    var runList = sourceField.GetContentRunsWithDelim("{[", "]}", runProps).ToList();
                                    if (childPara != null) {
                                        return PWrap(childPara.Attributes(), pProps, runList);
                                    } // else
                                    return runList;
                                }
                            }
                        }
                    }
                }
                return new XElement(element.Name,
                    element.Attributes(),
                    element.Nodes().Select(n => ReplaceFields(n, destinationFormat, fieldMap, comments, te)));
            }
            return node;
        }

        private static string GetFieldType(FieldReplacement field) {
            var fieldContent = field.content;
            if (fieldContent.StartsWith("list ")) return "List";
            else if (fieldContent.StartsWith("endlist")) return "EndList";
            else if (fieldContent.StartsWith("if ")) return "If";
            else if (fieldContent.StartsWith("elseif ")) return "ElseIf";
            else if (fieldContent.StartsWith("else")) return "Else";
            else if (fieldContent.StartsWith("endif")) return "EndIf";
            else return "Content";
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

        private static XName[] s_MetaToForceToBlock = new XName[] {
            OD.If,
            OD.ElseIf,
            OD.Else,
            OD.EndIf,
            OD.List,
            OD.EndList
        };

        private static Dictionary<XName, string> s_MatchingFieldNames = new Dictionary<XName, string> {
            [OD.If] = "'endif'",
            [OD.ElseIf] = "'if' and 'endif'",
            [OD.Else] = "'if' and 'endif'",
            [OD.EndIf] = "'if'",
            [OD.List] = "'endlist'",
            [OD.EndList] = "'list'"
        };

        private static object ForceBlockLevelAsAppropriate(XNode node, TemplateErrorList te)
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
                            string errorMessage = string.Format("Error: The '{0}' must either be in the same paragraph as its matching {1}, or in a paragraph by itself.", child.Name.LocalName.ToLower(), s_MatchingFieldNames[child.Name]);
                            newMeta.ReplaceWith(CreateRunErrorMessage(child, errorMessage, te));
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
                                return CreateContextErrorMessage(element, c, "Error: Mismatched 'list' / 'endlist' at run level", te);
                        }
                        else if (c.Name == OD.If)
                        {
                            stack.Push(c.Name);
                        }
                        else if (c.Name == OD.ElseIf)
                        {
                            if (stack.Peek() != OD.If)
                                return CreateContextErrorMessage(element, c, "Error: 'elseif' outside of 'if' / 'endif' at run level", te);
                        }
                        else if (c.Name == OD.Else)
                        {
                            if (stack.Peek() != OD.If)
                                return CreateContextErrorMessage(element, c, "Error: 'else' outside of 'if' / 'endif' at run level", te);
                        }
                        else if (c.Name == OD.EndIf)
                        {
                            if (stack.Pop() != OD.If)
                                return CreateContextErrorMessage(element, c, "Error: Mismatched 'if' / 'endif' at run level", te);
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
        private static void NormalizeRepeatAndConditional(XElement xDoc, TemplateErrorList te)
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
                    XElement runProps = null;
                    if (metadata.Name == OD.List)
                    {
                        matchingEndName = OD.EndList;
                        runProps = metadata.Descendants(W.r).FirstOrDefault()?.Elements(W.rPr).FirstOrDefault();
                        if (runProps != null)
                            runProps.Remove();
                    }
                    else if (metadata.Name == OD.If)
                        matchingEndName = OD.EndIf;
                    if (matchingEndName == null)
                        throw new FieldParseException("Internal error");
                    var matchingEnd = metadata.ElementsAfterSelf(matchingEndName).FirstOrDefault(end => { return (int)end.Attribute(OD.Depth) == depth; });
                    if (matchingEnd == null)
                    {
                        metadata.ReplaceWith(CreateParaErrorMessage(metadata, string.Format("Error: The '{0}' does not have a matching '{1}'", metadata.Name.LocalName, matchingEndName.LocalName), te));
                        continue;
                    }
                    metadata.RemoveNodes(); // Gets rid of the formatted content of the "if" or "list" field itself
                    // but remember formatting of list field for later insertion of punctuation
                    if (runProps != null)
                    {
                        var props = runProps.Elements().ToList();
                        foreach (var item in props)
                            item.Remove(); // remove each node from the W.rPr element
                        metadata.Add(new XElement(OD.ListPr, props));
                    }
                    var contentBetween = metadata.ElementsAfterSelf().TakeWhile(after => after != matchingEnd).ToList();
                    foreach (var item in contentBetween)
                        item.Remove(); // remove each node from its parent element
                    contentBetween = contentBetween.Where(n => n.Name != W.bookmarkStart && n.Name != W.bookmarkEnd).ToList(); // ignore bookmarks
                    // add each content item (one-at-a-time) as a child of the metadata element,
                    // looking for "else ifs" and "elses", and making them nested parents of the appropriate content
                    var metadataParent = metadata;
                    foreach (var e in contentBetween)
                    {
                        metadataParent.Add(e);
                        if (metadata.Name == OD.If && (e.Name == OD.ElseIf || e.Name == OD.Else) && ((int)e.Attribute(OD.Depth) == depth))
                        {
                            e.RemoveNodes(); // Gets rid of the formatted content of the nested "elseif" or "else" field itself
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

        private static void ProcessOrphanEndRepeatEndConditional(XElement xDocRoot, TemplateErrorList te)
        {
            foreach (var element in xDocRoot.Descendants(OD.EndList).ToList())
            {
                var error = CreateContextErrorMessage(element, element, "Error: 'endlist' without matching 'list'", te);
                element.ReplaceWith(error);
            }
            foreach (var element in xDocRoot.Descendants(OD.EndIf).ToList())
            {
                var error = CreateContextErrorMessage(element, element, "Error: 'endif' without matching 'if'", te);
                element.ReplaceWith(error);
            }
        }

        private static void SimplifyTemplateMarkup(WordprocessingDocument wordDoc, bool removeComments = true)
        {
            // strip down the template to eliminate unnecessary work
            SimplifyMarkupSettings settings = new SimplifyMarkupSettings
            {
                RemoveComments = removeComments,
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

        private static object CreateContextErrorMessage(XElement element, XElement meta, string errorMessage, TemplateErrorList errors)
        {
            XElement para = element.Descendants(W.p).FirstOrDefault();
            XElement run = element.Descendants(W.r).FirstOrDefault();
            var errorRun = CreateRunErrorMessage(meta, errorMessage, errors);
            if (para != null)
                return new XElement(W.p, errorRun);
            else
                return errorRun;
        }

        private static XElement CreateRunErrorMessage(XElement meta, string errorMessage, TemplateErrorList errors)
        {
            string fieldId = meta?.Attribute(OD.Id)?.Value;
            string fieldText = meta?.Value;
            errors.Add(fieldId, fieldText, errorMessage);
            var errorRun = new XElement(W.r,
                new XElement(W.rPr,
                    new XElement(W.color, new XAttribute(W.val, "FF0000")),
                    new XElement(W.highlight, new XAttribute(W.val, "yellow"))),
                    new XElement(W.t, errorMessage));
            return errorRun;
        }

        private static XElement CreateParaErrorMessage(XElement meta, string errorMessage, TemplateErrorList errors)
        {
            string fieldId = meta?.Attribute(OD.Id)?.Value;
            string fieldText = meta?.Value;
            errors.Add(fieldId, fieldText, errorMessage);
            var errorPara = new XElement(W.p,
                new XElement(W.r,
                    new XElement(W.rPr,
                        new XElement(W.color, new XAttribute(W.val, "FF0000")),
                        new XElement(W.highlight, new XAttribute(W.val, "yellow"))),
                        new XElement(W.t, errorMessage)));
            return errorPara;
        }

        private static object AddListPunctuationPlaceholders(XNode node, TemplateErrorList te)
        {
            XElement element = node as XElement;
            if (element != null)
            {
                if (element.Name == OD.List)
                {
                    var listPr = element.Elements(OD.ListPr).FirstOrDefault();
                    if (listPr != null)
                        listPr.Remove();
                    XElement puncRun = new XElement(OD.Content,
                        element.Attribute(OD.Id),
                        new XAttribute(OD.Punc, true),
                        new XElement(
                            W.r,
                            (listPr != null) ? new XElement(W.rPr, listPr.Elements()) : null,
                            new XElement(W.t, "[_punc]")
                        )
                    );
                    XElement para = element.Descendants(W.p).LastOrDefault();
                    if (para != null) // block-level list
                    {
                        if (object.ReferenceEquals(element, para.Parent))
                        {
                            // the last paragraph in the list is a direct child of the list, so go ahead and append the punctuation to that paragraph's content
                            return new XElement(OD.List,
                                element.Attributes(),
                                para.NodesBeforeSelf().Select(n => AddListPunctuationPlaceholders(n, te)),
                                new XElement(W.p,
                                    para.Attributes(), 
                                    para.Nodes().Select(n => AddListPunctuationPlaceholders(n, te)),
                                    puncRun),
                                para.NodesAfterSelf().Select(n => AddListPunctuationPlaceholders(n, te)));
                        }
                        else if (para.Parent.Name == OD.Content && object.ReferenceEquals(element, para.Parent.Parent))
                        {
                            // the last paragraph is a child of a Content element, meaning, that "metadata" (content element) is block-level.
                            // force block-level metadata down to a child of the paragraph (so punctuation can be appended)
                            var contentElem = para.Parent;
                            return new XElement(OD.List,
                                element.Attributes(),
                                contentElem.NodesBeforeSelf().Select(n => AddListPunctuationPlaceholders(n, te)),
                                new XElement(W.p,
                                    para.Attributes(),
                                    para.Elements(W.pPr),
                                    new XElement(contentElem.Name,
                                        contentElem.Attributes(),
                                        para.Nodes()
                                            .Where(n => n.NodeType != System.Xml.XmlNodeType.Element || (n as XElement).Name != W.pPr)
                                            .Select(n => AddListPunctuationPlaceholders(n, te))),
                                    puncRun),
                                contentElem.NodesAfterSelf().Select(n => AddListPunctuationPlaceholders(n, te)));
                        }
                        // the last paragraph is a child of something else (such as a nested list), so don't put THIS list's punctuation on it
                        return new XElement(OD.List,
                            element.Attributes(),
                            element.Nodes().Select(n => AddListPunctuationPlaceholders(n, te)));
                    }
                    else // run-level list
                    {
                        return new XElement(OD.List,
                            element.Attributes(),
                            element.Nodes().Select(n => AddListPunctuationPlaceholders(n, te)).Append(puncRun));
                    }
                } // else anything but an OD.List
                return new XElement(element.Name,
                    element.Attributes(),
                    element.Nodes().Select(n => AddListPunctuationPlaceholders(n, te)));
            }
            return node; // (null)
        }

        static XElement CCWrap(params object[] content) => new XElement(W.sdt, new XElement(W.sdtContent, content));

        static XElement PWrap(params object[] content) => new XElement(W.p, content);

        private enum FC {
            Content,
            Conditional,
            List,
            ListPunctuation
        };

        private static string GetSelector(FC context, string fieldId, FieldReplacementIndex fieldMap)
        {
            var baseContent = fieldMap[fieldId].ToString();
            if (context != FC.Content) { // trim field type keyword off beginning of the content
                var spc = baseContent.IndexOf(' ');
                Debug.Assert(spc == 2 || spc == 4 || spc == 6); // if, list/else, elseif
                baseContent = baseContent.Substring(spc).Trim();
            }
            switch (context) {
                case FC.Content:
                    // "./whatever" (alone) may return a single item OR it may return
                    // an array containing a single item. In either situation, we just want
                    // the item itself, not the array! So we append [1] to be explicit:
                    return "./" + baseContent + "[1]";
                case FC.List:
                    // "./whatever[1]" returns the list itself; instead select all the
                    // individual items WITHIN the list:
                    return "./" + baseContent + "[1]/" + baseContent + "i"; // with old atomizer, used to be + "0";
                case FC.ListPunctuation:
                    // punctuation content elements always carry the fieldId of the list with which they are associated,
                    // so baseContent is now the atom associated with the list. Append a "p" for punctuation.
                    return "./" + baseContent + "p"; // with old atomizer, used to be + "1";
                case FC.Conditional:
                    // add "b" suffix because the value is being checked explicitly as a Boolean
                    return baseContent + "b[1]"; // with old atomizer, used to be + "2[1]"
            }
            throw new ArgumentException("Unhandled field context", "context");
        }

        static object ContentReplacementTransform(XNode node, FieldReplacementIndex fieldMap, TemplateErrorList templateError)
        {
            XElement element = node as XElement;
            if (element != null)
            {
                if (element.Name == OD.Content)
                {
                    var selector = GetSelector(
                        element.Attribute(OD.Punc) == null ? FC.Content : FC.ListPunctuation,
                        element.Attribute(OD.Id).Value,
                        fieldMap);
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
                        ccc = new XElement(W.r,
                            run?.Elements(W.rPr).FirstOrDefault(),
                            new XElement(W.t, fieldText));
                    }
                    return CCWrap(ccc);
                }
                if (element.Name == OD.List)
                {
                    var selector = GetSelector(FC.List, element.Attribute(OD.Id).Value, fieldMap);
                    var startText = "<" + PA.Repeat + " "
                        + PA.Select + "=\"" + selector + "\" "
                        + PA.Optional + "=\"true\"/>";
                    var endText = "<" + PA.EndRepeat + "/>";
                    XElement para = element.Descendants(W.p).FirstOrDefault();
                    var repeatingContent = element
                        .Elements()
                        .Select(e => ContentReplacementTransform(e, fieldMap, templateError))
                        .ToList();
                    XElement startElem = new XElement(W.r, new XElement(W.t, startText));
                    XElement endElem = new XElement(W.r, new XElement(W.t, endText));
                    if (para != null) // block-level list
                    {
                        // prefix and suffix repeating content with block-level repeat elements/tags
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
                    var endText = "<" + PA.EndConditional + "/>";
                    XElement endElem = new XElement(W.r, new XElement(W.t, endText));
                    bool blockLevel = (element.IsEmpty && (element.Ancestors(W.p).FirstOrDefault() == null))
                        || (element.Descendants(W.p).FirstOrDefault() != null);
                    if (element.Name == OD.If)
                    {
                        var selector = GetSelector(FC.Conditional, element.Attribute(OD.Id).Value, fieldMap);
                        var startText = "<" + PA.Conditional + " "
                            + PA.Select + "=\"" + selector + "\" "
                            + PA.Match + "=\"true\"/>";
                        var content = element
                            .Elements()
                            .Select(e => ContentReplacementTransform(e, fieldMap, templateError))
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
                        var selector = GetSelector(FC.Conditional, lookUp.Attribute(OD.Id).Value, fieldMap);
                        var startElseText = "<" + PA.Conditional + " "
                            + PA.Select + "=\"" + selector + "\" "
                            + PA.NotMatch + "=\"true\"/>"; // NotMatch instead of Match, represents "Else" branch
                        selector = GetSelector(FC.Conditional, element.Attribute(OD.Id).Value, fieldMap);
                        var nestedIfText = "<" + PA.Conditional + " "
                            + PA.Select + "=\"" + selector + "\" "
                            + PA.Match + "=\"true\"/>";
                        var content = element
                            .Elements()
                            .Select(e => ContentReplacementTransform(e, fieldMap, templateError))
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
                        while (lookUp != null && lookUp.Name != OD.If && lookUp.Name != OD.ElseIf)
                            lookUp = lookUp.Parent;
                        // if lookUp == null, Something is wrong -- else not inside an if?
                        if (lookUp != null)
                        {
                            var selector = GetSelector(FC.Conditional, lookUp.Attribute(OD.Id).Value, fieldMap);
                            var startElseText = "<" + PA.Conditional + " "
                                + PA.Select + "=\"" + selector + "\" "
                                + PA.NotMatch + "=\"true\"/>"; // NotMatch instead of Match, represents "Else" branch

                            var content = element
                                .Elements()
                                .Select(e => ContentReplacementTransform(e, fieldMap, templateError))
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
                }
                return new XElement(element.Name,
                    element.Attributes(),
                    element.Nodes().Select(n => ContentReplacementTransform(n, fieldMap, templateError)));
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
