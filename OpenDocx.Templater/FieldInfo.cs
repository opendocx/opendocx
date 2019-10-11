using System;
using System.Collections.Generic;
using System.Text;

namespace OpenDocx
{
    public class FieldAccumulator
    {
        private Stack<FieldBlock> blocks;
        private int fieldCount;

        public FieldAccumulator()
        {
            blocks = new Stack<FieldBlock>();
            blocks.Push(new FieldBlock());
            fieldCount = 0;
        }

        public string AddField(string contents)
        {
            fieldCount++;
            var fieldId = fieldCount.ToString();
            blocks.Peek().AddField(new FieldInfo(contents, fieldId));
            return fieldId;
        }

        public void BeginBlock()
        {
            blocks.Push(new FieldBlock());
        }

        public void EndBlock()
        {
            var block = blocks.Pop();
            if (!block.IsEmpty)
            {
                if (block.FieldCount == 1)
                    blocks.Peek().AddField(block.GetItem(0));
                else
                    blocks.Peek().AddField(block);
            }
        }

        public void JsonSerialize(System.IO.StreamWriter writer)
        {
            System.Diagnostics.Debug.Assert(blocks.Count == 1);
            writer.Write(blocks.Peek().JsonSerialize());
        }

        private interface ExtractedItem
        {
            string JsonSerialize();
        }

        private class FieldBlock : ExtractedItem
        {
            private List<ExtractedItem> list;

            public FieldBlock()
            {
                list = new List<ExtractedItem>();
            }

            public bool IsEmpty { get { return list.Count == 0; } }

            public int FieldCount { get { return list.Count; } }

            public ExtractedItem GetItem(int index)
            {
                return list[index];
            }

            public void AddField(ExtractedItem field)
            {
                list.Add(field);
            }
            public string JsonSerialize()
            {
                var sw = new StringBuilder();
                sw.Append('[');
                bool first = true;
                foreach (var field in list)
                {
                    if (first)
                        first = false;
                    else
                        sw.Append(',');
                    sw.Append(field.JsonSerialize());
                }
                sw.Append(']');
                return sw.ToString();
            }
        }

        private class FieldInfo : ExtractedItem
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
}
