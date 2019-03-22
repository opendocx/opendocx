namespace OpenDocx
{
    public class CompileResult
    {
        public string DocxGenTemplate { get; }
        public bool HasErrors { get; }

        internal CompileResult(string compiledTemplate, bool hasErrors)
        {
            DocxGenTemplate = compiledTemplate;
            HasErrors = hasErrors;
        }
    }
}
