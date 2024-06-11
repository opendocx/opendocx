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

    public class NormalizeResult
    {
        public byte[] NormalizedTemplate { get; }
        public string ExtractedFields { get; }

        internal NormalizeResult(byte[] normalizedTemplate, string extractedFields)
        {
            NormalizedTemplate = normalizedTemplate;
            ExtractedFields = extractedFields;
        }
    }
}
