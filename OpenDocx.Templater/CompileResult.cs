namespace OpenDocx
{
    public class CompileResult
    {
        public string DocxGenTemplate { get; }
        public bool HasErrors { get; }
        public string[] Errors { get; }

        internal CompileResult(string compiledTemplate, string[] errors)
        {
            DocxGenTemplate = compiledTemplate;
            Errors = errors;
            HasErrors = (errors != null) && (errors.Length > 0);
        }
    }
}
