using System.Xml.Linq;
using System.Text.RegularExpressions;

namespace OpenDocx
{
    public class MetadataParser : IMetadataParser
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

        public XElement TransformContentToMetadata(string content)
        {
            XElement xml;
            Match match;
            if ((match = _ifRE.Match(content)).Success)
            {
                xml = new XElement(DocumentAssemblerBase.PA.Conditional);
                xml.SetAttributeValue(DocumentAssemblerBase.PA.Select, match.Groups[1]);
            }
            else if ((match = _elseifRE.Match(content)).Success)
            {
                xml = new XElement(DocumentAssemblerBase.PA.ElseConditional);
                xml.SetAttributeValue(DocumentAssemblerBase.PA.Select, match.Groups[1]);
            }
            else if (_elseRE.IsMatch(content))
            {
                xml = new XElement(DocumentAssemblerBase.PA.Else);
            }
            else if (_endifRE.IsMatch(content))
            {
                xml = new XElement(DocumentAssemblerBase.PA.EndConditional);
            }
            else if ((match = _listRE.Match(content)).Success)
            {
                xml = new XElement(DocumentAssemblerBase.PA.Repeat);
                xml.SetAttributeValue(DocumentAssemblerBase.PA.Select, match.Groups[1]);
            }
            else if (_endlistRE.IsMatch(content))
            {
                xml = new XElement(DocumentAssemblerBase.PA.EndRepeat);
            }
            else if (content.StartsWith(DelimiterOpen) && content.EndsWith(DelimiterClose))
            {
                content = content.Substring(DelimiterOpen.Length, content.Length - DelimiterOpen.Length - DelimiterClose.Length).Trim();
                xml = new XElement(DocumentAssemblerBase.PA.Content);
                xml.SetAttributeValue(DocumentAssemblerBase.PA.Select, content);
            }
            else
                throw new MetadataParseException("Unrecognized field delimiters?");
            return xml;
        }

    }
}
