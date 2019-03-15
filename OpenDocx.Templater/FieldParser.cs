/***************************************************************************

Copyright (c) Lowell Stewart 2018-2019.
Licensed under the Mozilla Public License. See LICENSE file in the project root for full license information.

Published at https://github.com/opendocx/opendocx
Developer: Lowell Stewart
Email: lowell@opendocx.com

***************************************************************************/

// comments on this file:
// fields in an OpenDocx template contain two "parts"
//    - the field type
//    - (for many fields) an expression to be evaluated (against a data context) in order to assemble a document
//
// The ParseField method in this file parses the former -- field type -- so the template can be analyzed and structured.
// It does NOT (directly) parse the expressions.
//
// The ParseFieldAsync method FIRST calls ParseField to parse the field structure, and THEN it calls out to Node.js
// (via Edge.js) to allow each field to be parsed in that environment. However, if you instantiate ParseFieldAsync
// WITHOUT providing a parseField callback, it will simply parse the field types syncrhonously (same as ParseField).
// So basically, ParseFieldAsync will function either asynchronously or synchronously, depending on whether the calling
// code provides a callback or not.

using System;
using System.Dynamic;
using System.Collections.Generic;
using System.Xml.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace OpenDocx
{
    public class FieldParser : IFieldParser
    {
        public string DelimiterOpen => "[";
        public string DelimiterClose => "]";
        public string EmbedOpen => "{";
        public string EmbedClose => "}";

        private Regex _ifRE      = new Regex(@"\[\s*(?:if\b|\?)\s*(.*?)\s*\]");
        private Regex _elseifRE  = new Regex(@"\[\s*(?:elseif\b|\:\?)\s*(.*?)\s*\]");
        private Regex _elseRE    = new Regex(@"\[\s*(?:else|\:)\s*\]");
        private Regex _endifRE   = new Regex(@"\[\s*(?:endif|\/\?)(?:.*?)\]");
        private Regex _listRE    = new Regex(@"\[\s*(?:list\b|\#)\s*(.*?)\s*\]");
        private Regex _endlistRE = new Regex(@"\[\s*(?:endlist|\/\#)(?:.*?)\]");

        public XElement ParseField(string content)
        {
            XElement xml;
            Match match;
            if ((match = _ifRE.Match(content)).Success)
            {
                xml = new XElement(Templater.OD.If);
                xml.SetAttributeValue(Templater.OD.Expr, match.Groups[1]);
            }
            else if ((match = _elseifRE.Match(content)).Success)
            {
                xml = new XElement(Templater.OD.ElseIf);
                xml.SetAttributeValue(Templater.OD.Expr, match.Groups[1]);
            }
            else if (_elseRE.IsMatch(content))
            {
                xml = new XElement(Templater.OD.Else);
            }
            else if (_endifRE.IsMatch(content))
            {
                xml = new XElement(Templater.OD.EndIf);
            }
            else if ((match = _listRE.Match(content)).Success)
            {
                xml = new XElement(Templater.OD.List);
                xml.SetAttributeValue(Templater.OD.Expr, match.Groups[1]);
            }
            else if (_endlistRE.IsMatch(content))
            {
                xml = new XElement(Templater.OD.EndList);
            }
            else if (content.StartsWith(DelimiterOpen) && content.EndsWith(DelimiterClose))
            {
                content = content.Substring(DelimiterOpen.Length, content.Length - DelimiterOpen.Length - DelimiterClose.Length).Trim();
                xml = new XElement(Templater.OD.Content);
                xml.SetAttributeValue(Templater.OD.Expr, content);
            }
            else
                throw new FieldParseException("Unrecognized field delimiters?");
            return xml;
        }
    }

    public class AsyncFieldParser : FieldParser, IAsyncFieldParser
    {
        private Func<object, Task<object>> _parseField;

        public AsyncFieldParser()
        {
            _parseField = null;
        }

        public AsyncFieldParser(Func<object, Task<object>> parseFieldCallback)
        {
            _parseField = parseFieldCallback;
        }

        public AsyncFieldParser(AsyncFieldParser parent)
        {
            _parseField = parent._parseField;
        }

        public async Task<XElement> ParseFieldAsync(string content)
        {
            var elem = ParseField(content);
            // now parse expression within the field, if any
            var exprAttr = elem.Attribute(Templater.OD.Expr);
            if (exprAttr != null && _parseField != null)
            {
                var expression = exprAttr.Value;
                try
                {
                    var payload = new { type = elem.Name.ToString(), expr = expression };
                    dynamic result = await _parseField(payload);
                }
                catch (Exception e)
                {
                    throw new FieldParseException("FieldParseException: " + e.Message, e);
                }
            }
            return elem;
        }

    }
}
