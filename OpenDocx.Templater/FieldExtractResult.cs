using System;
using System.Collections.Generic;
using System.Text;

namespace OpenDocx
{
    public class FieldExtractResult
    {
        public string TempTemplate { get; }
        public string ExtractedFields { get; }

        internal FieldExtractResult(string tempTemplate, string extractedFields)
        {
            TempTemplate = tempTemplate;
            ExtractedFields = extractedFields;
        }
    }
}
