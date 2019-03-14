using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using OpenXmlPowerTools;

namespace OpenDocx
{
    public class CompileResult
    {
        public WmlDocument CompiledTemplate { get; private set; }
        public string ExtractedLogicFileName { get; }
        public bool HasErrors { get; private set; }

        internal CompileResult(WmlDocument compiledTemplate, string extractedLogicFileName, bool hasErrors)
        {
            CompiledTemplate = compiledTemplate;
            ExtractedLogicFileName = extractedLogicFileName;
            HasErrors = hasErrors;
        }
    }
}
