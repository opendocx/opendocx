using System;
using System.Collections.Generic;
using System.Text;

namespace OpenDocx
{
    public class FieldAccumulator : List<FieldInfo> { }

    public class FieldInfo
    {
        public string content { get; }
        public string id { get; }
        public FieldInfo(string fieldContent, string fieldId)
        {
            content = fieldContent;
            id = fieldId;
        }
        public string JsonSerialize()
        {
            var sw = new StringBuilder();
            sw.Append('{');
            sw.Append("\"content\":\"");
            sw.Append(content.Replace(@"\", @"\\").Replace(@"""", @"\"""));
            sw.Append("\",\"id\":\"");
            sw.Append(id);
            sw.Append("\"");
            sw.Append('}');
            return sw.ToString();
        }
    }
}
