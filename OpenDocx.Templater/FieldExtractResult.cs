using System;
using System.Collections.Generic;
using System.Text;

namespace OpenDocx
{
    public class FieldExtractResult
    {
        public string TempTemplate { get; }
        public string ExtractedFields { get; }
        public bool HasErrors { get; }

        internal FieldExtractResult(string tempTemplate, string extractedFields, bool hasErrors)
        {
            TempTemplate = tempTemplate;
            ExtractedFields = extractedFields;
            HasErrors = hasErrors;
        }
    }
}
