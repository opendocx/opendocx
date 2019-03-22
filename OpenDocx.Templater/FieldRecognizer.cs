using System;
using System.Collections.Generic;
using System.Text;

namespace OpenDocx
{
    static class FieldRecognizer
    {
        public static string FieldBegin => "[";
        public static string FieldEnd => "]";
        public static string EmbedBegin => "{";
        public static string EmbedEnd => "}";

        public static bool IsField(string content, out string fieldText)
        {
            if (content.StartsWith(FieldBegin) && content.EndsWith(FieldEnd))
            {
                fieldText = content.Substring(FieldBegin.Length, content.Length - FieldBegin.Length - FieldEnd.Length).Trim();
                return true;
            }
            // else
            fieldText = null;
            return false;
        }
    }
}
