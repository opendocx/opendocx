using System;
using System.Text.RegularExpressions;

namespace OpenDocx
{
    public class FieldRecognizer
    {
        public static FieldRecognizer Default => new FieldRecognizer();

        public string FieldBegin;
        public string FieldEnd;
        public string EmbedBegin;
        public string EmbedEnd;

        public string CombinedBegin => EmbedBegin + FieldBegin;
        public string CombinedEnd => FieldEnd + EmbedEnd;

        public int EmbedBeginLength => EmbedBegin.Length;
        public int EmbedDelimLength => EmbedBegin.Length + EmbedEnd.Length;
        public Regex Regex;

        public FieldRecognizer(string fieldDelims = "[]", string embedDelims = "{}") {
            if (!string.IsNullOrEmpty(fieldDelims) && fieldDelims.Length % 2 == 0) {
                FieldBegin = fieldDelims.Substring(0, fieldDelims.Length / 2);
                FieldEnd = fieldDelims.Substring(fieldDelims.Length / 2, fieldDelims.Length - 1);
            } else {
                throw new ArgumentException("Field recognizer requires even-length fieldDelims");
            }
            if (string.IsNullOrEmpty(embedDelims)) {
                EmbedBegin = string.Empty;
                EmbedEnd = string.Empty;
            } else if (embedDelims.Length % 2 == 0) {
                EmbedBegin = embedDelims.Substring(0, embedDelims.Length / 2);
                EmbedEnd = embedDelims.Substring(embedDelims.Length / 2, embedDelims.Length - 1);
            } else {
                throw new ArgumentException("Field recognizer requires even-length embedDelims");
            }
            Regex = new Regex(Regex.Escape(CombinedBegin) + ".*?" + Regex.Escape(CombinedEnd));
        }

        public bool IsField(string content, out string fieldText)
        {
            if (content.StartsWith(FieldBegin) && content.EndsWith(FieldEnd))
            {
                fieldText = content
                    .Substring(FieldBegin.Length, content.Length - FieldBegin.Length - FieldEnd.Length)
                    .Trim();
                return true;
            }
            // else
            fieldText = null;
            return false;
        }
    }
}
