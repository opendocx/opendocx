namespace OpenDocx
{
    public class AssembleResult
    {
        public string Document { get; }
        public byte[] Bytes { get; }
        public bool HasErrors { get; }

        internal AssembleResult(string documentFilename, bool hasErrors)
        {
            Document = documentFilename;
            HasErrors = hasErrors;
        }

        internal AssembleResult(byte[] document, bool hasErrors)
        {
            Bytes = document;
            HasErrors = hasErrors;
        }
    }
}
