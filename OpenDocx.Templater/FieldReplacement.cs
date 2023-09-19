using System.Collections.Generic;

namespace OpenDocx;

public class FieldReplacement
{
    public string content;
    public string comment;

    public FieldReplacement(string content, string comment = null) {
        this.content = content;
        if (comment != null) {
            this.comment = comment;
        }
    }
    public FieldReplacement(FieldTransformInfo field, string comment = null) : this(field.Content, comment) {}

    public override string ToString() {
        return this.content;
    }
}

public class FieldReplacementIndex : Dictionary<string, FieldReplacement> {}
