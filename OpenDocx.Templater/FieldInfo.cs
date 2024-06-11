using System;
using System.Collections.Generic;
using System.IO;

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

        public void RegisterNonFieldContentInBlock()
        {
            blocks.Peek().RegisterOtherContent();
        }

        public void EndBlock()
        {
            var block = blocks.Pop();
            if (!block.IsEmpty)
            {
                if (block.FieldCount == 1 && !block.HasOtherContent)
                    blocks.Peek().AddField(block.GetItem(0));
                else
                    blocks.Peek().AddField(block);
            }
        }

        public void JsonSerialize(TextWriter writer)
        {
            System.Diagnostics.Debug.Assert(blocks.Count == 1);
            blocks.Peek().JsonSerialize(writer);
        }

        private interface ExtractedItem
        {
            void JsonSerialize(TextWriter writer);
        }

        private class FieldBlock : ExtractedItem
        {
            private List<ExtractedItem> list;

            public FieldBlock()
            {
                list = new List<ExtractedItem>();
                HasOtherContent = false;
            }

            public bool IsEmpty { get { return list.Count == 0; } }

            public int FieldCount { get { return list.Count; } }

            public bool HasOtherContent { get; private set; }

            public ExtractedItem GetItem(int index)
            {
                return list[index];
            }

            public void AddField(ExtractedItem field)
            {
                list.Add(field);
            }
            public void RegisterOtherContent()
            {
                HasOtherContent = true;
            }
            public void JsonSerialize(TextWriter sw)
            {
                sw.Write('[');
                bool first = true;
                foreach (var field in list)
                {
                    if (first)
                        first = false;
                    else
                        sw.Write(',');
                    field.JsonSerialize(sw);
                }
                sw.Write(']');
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
            public void JsonSerialize(TextWriter sw)
            {
                sw.Write('{');
                sw.Write("\"content\":\"");
                sw.Write(content.Replace(@"\", @"\\").Replace(@"""", @"\""")
                    .Replace("\r", String.Empty).Replace("\n", @"\\n"));
                sw.Write("\",\"id\":\"");
                sw.Write(id);
                sw.Write("\"");
                sw.Write('}');
            }
        }
    }
}
