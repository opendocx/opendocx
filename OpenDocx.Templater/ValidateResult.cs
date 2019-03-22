using System;
using System.Collections.Generic;
using System.Text;

namespace OpenDocx
{
    public class ValidateResult
    {
        public bool HasErrors { get; }
        public string ErrorList { get; }

        internal ValidateResult(bool hasErrors, string errorList)
        {
            HasErrors = hasErrors;
            ErrorList = errorList;
        }
    }
}
