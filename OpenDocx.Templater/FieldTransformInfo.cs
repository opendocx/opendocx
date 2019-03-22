using System;
using System.Collections.Generic;
using System.Text;

namespace OpenDocx
{
    public class FieldTransformInfo
    {
        public string fieldType;
        public string atomizedExpr;
    }

    public class FieldTransformIndex : Dictionary<string, FieldTransformInfo>
    {

    }
}
