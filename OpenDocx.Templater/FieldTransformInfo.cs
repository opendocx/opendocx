using System;
using System.Collections.Generic;

namespace OpenDocx
{
    public class FieldTransformInfo
    {
        public string fieldType;
        public string atomizedExpr;

        private string Prefix {
            get {
                switch (fieldType) {
                    case "Content":
                        return string.Empty;
                    case "If":
                        return "if ";
                    case "EndIf":
                        return "endif";
                    case "Else":
                        return "else";
                    case "ElseIf":
                        return "elseif ";
                    case "List":
                        return "list ";
                    case "EndList":
                        return "endlist";
                }
                throw new Exception("Unexpected fieldType");
            }
        }

        public string Content {
            get {
                return Prefix + atomizedExpr;
            }
        }
    }

    public class FieldTransformIndex : Dictionary<string, FieldTransformInfo>
    {

    }
}
