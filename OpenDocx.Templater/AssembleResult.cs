namespace OpenDocx
{
    public class AssembleResult
    {
        public string Document { get; }
        public bool HasErrors { get; }

        internal AssembleResult(string documentFilename, bool hasErrors)
        {
            Document = documentFilename;
            HasErrors = hasErrors;
        }
    }
}
