namespace OpenDocx
{
    public class CompileResult
    {
        public string DocxGenTemplate { get; }
        public string ExtractedLogic { get; }
        public bool HasErrors { get; }

        internal CompileResult(string compiledTemplate, string extractedLogicFileName, bool hasErrors)
        {
            DocxGenTemplate = compiledTemplate;
            ExtractedLogic = extractedLogicFileName;
            HasErrors = hasErrors;
        }
    }
}
