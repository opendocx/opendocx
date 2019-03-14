using System;
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

        public AsyncFieldParser(dynamic options)
        {
            _parseField = (Func<object, Task<object>>)options.parseField;
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
                    throw new EvaluationException("EvaluationException: " + e.Message, e);
                }
            }
            return elem;
        }

    }
}
