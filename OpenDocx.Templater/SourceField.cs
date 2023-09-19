using System.Xml.Linq;
using System.Collections.Generic;
using OpenXmlPowerTools;

namespace OpenDocx {

    public class SourceField
    {
        // default field colors
        private static readonly string CONTENT_COLOR = "2157AD"; // blue
        private static readonly string IF_COLOR = "41A151"; // green
        private static readonly string LIST_COLOR = "C8792A"; // amber
        private static readonly string TRAILER_COLOR = "969696"; // gray
        private static readonly string CONTENT_BACKGROUND = "C9E1F3"; // light blue
        private static readonly string IF_BACKGROUND = "C9F3CD"; // light green
        private static readonly string LIST_BACKGROUND = "FAE7D2"; // light amber

        public string keyword;
        public string keywordColor;
        public string background;
        public string expression;
        public string trailer;
        public string fieldId;
        public string comment;
        public string commentId;

        public SourceField(FieldReplacement field, CommentAdder comments)
            : this(field.content, field.comment, comments) {}
        
        public SourceField(string content, string documentComment = null, CommentAdder comments = null) {
          this.comment = documentComment;
          if (!string.IsNullOrEmpty(this.comment) && comments != null) {
            this.commentId = comments.CreateComment(this.comment);
          }
          if (content.StartsWith("list ")) {
            this.keyword = "list";
            this.keywordColor = LIST_COLOR;
            this.expression = content.Substring(this.keyword.Length).Trim();
            this.background = LIST_BACKGROUND;
          }
          else if (content.StartsWith("endlist")) {
            this.keyword = "endlist";
            this.keywordColor = LIST_COLOR;
            this.background = LIST_BACKGROUND;
            this.trailer = content.Substring(this.keyword.Length).Trim();
          }
          else if (content.StartsWith("if ")) {
            this.keyword = "if";
            this.keywordColor = IF_COLOR;
            this.expression = content.Substring(this.keyword.Length).Trim();
            this.background = IF_BACKGROUND;
          }
          else if (content.StartsWith("elseif ")) {
            this.keyword = "elseif";
            this.keywordColor = IF_COLOR;
            this.expression = content.Substring(this.keyword.Length).Trim();
            this.background = IF_BACKGROUND;
          }
          else if (content.StartsWith("else")) {
            this.keyword = "else";
            this.keywordColor = IF_COLOR;
            this.background = IF_BACKGROUND;
            this.trailer = content.Substring(this.keyword.Length).Trim();
          }
          else if (content.StartsWith("endif")) {
            this.keyword = "endif";
            this.keywordColor = IF_COLOR;
            this.background = IF_BACKGROUND;
            this.trailer = content.Substring(this.keyword.Length).Trim();
          }
          else { // assume content field
            this.keywordColor = CONTENT_COLOR;
            this.expression = content;
            this.background = CONTENT_BACKGROUND;
          }
        }

        public string GetContent()
        {
            if (string.IsNullOrEmpty(keyword)) {
                return expression;
            }
            if (string.IsNullOrEmpty(expression)) {
                if (string.IsNullOrEmpty(trailer)) {
                    return keyword;
                }
                return keyword + " " + trailer;
            }
            return keyword + " " + expression;
        }

        public object[] GetContentRuns() {
            var result = new List<XElement>();
            if (!string.IsNullOrEmpty(commentId)) {
                result.Add(new XElement(W.commentRangeStart, new XAttribute(W.id, commentId)));
            }
            if (string.IsNullOrEmpty(keyword)) {
                result.Add(CreateNPRun(expression, CONTENT_COLOR, CONTENT_BACKGROUND));
            }
            else if (string.IsNullOrEmpty(expression)) {
                if (string.IsNullOrEmpty(trailer)) {
                    result.Add(CreateNPRun(keyword, keywordColor, background, true));
                }
                else {
                    result.Add(CreateNPRun(keyword, keywordColor, background, true));
                    result.Add(CreateNPRun(" " + trailer, TRAILER_COLOR, background));
                }
            }
            else {
                result.Add(CreateNPRun(keyword, keywordColor, background, true));
                result.Add(CreateNPRun(" " + expression, CONTENT_COLOR, background));
            }
            if (!string.IsNullOrEmpty(commentId)) {
                result.Add(new XElement(W.commentRangeEnd, new XAttribute(W.id, commentId)));
                result.Add(new XElement(W.r,
                    new XElement(W.rPr,
                        new XElement(W.rStyle, new XAttribute(W.val, "CommentReference"))
                    ),
                    new XElement(W.commentReference, new XAttribute(W.id, commentId))
                ));
            }
            return result.ToArray();
        }

        public object[] GetContentRunsWithDelim(string before, string after, XElement delimiterRunProps) {
            return new object[] {
                new XElement(W.r, delimiterRunProps, new XElement(W.t, before)),
                this.GetContentRuns(),
                new XElement(W.r, delimiterRunProps, new XElement(W.t, after)),
            };
        }

        private static XElement CreateNPRun(string text, string color, string background, bool bold = false) =>
            new XElement(W.r,
                new XElement(W.rPr,
                    new XElement(W.noProof),
                    new XElement(W.color, new XAttribute(W.val, color)),
                    new XElement(W.shd,
                        new XAttribute(W.val, "clear"),
                        new XAttribute(W.color, "auto"),
                        new XAttribute(W.fill, background)
                    ),
                    bold ? new XElement(W.b) : null
                ),
                new XElement(W.t,
                    text.StartsWith(' ') || text.EndsWith(' ')
                        ? new XAttribute(XNamespace.Xml + "space", "preserve")
                        : null,
                    text
                )
            );

    }
}
