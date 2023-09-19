using System.Collections.Generic;

namespace OpenDocx
{
    internal class TemplateErrorList
    {
        public List<TemplateError> ErrorList = new List<TemplateError>();

        public bool HasError
        {
            get
            {
                return this.ErrorList.Count > 0;
            }
        }

        public void Add(string fieldId, string fieldText, string errorMessage)
        {
            ErrorList.Add(new TemplateError() { fieldId = fieldId, fieldText = fieldText, message = errorMessage });
        }
    }

    internal class TemplateError
    {
        public string fieldId;
        public string fieldText;
        public string message;

        public override string ToString()
        {
            if (string.IsNullOrEmpty(fieldId))
            {
                if (string.IsNullOrEmpty(fieldText))
                {
                    return message;
                }
                return string.Format("(In field \"{0}\"): {1}", fieldText, message);
            }
            else if (string.IsNullOrEmpty(fieldText))
            {
                return string.Format("Field \"{0}\": {1}", fieldId, message);
            }
            else
            {
                return string.Format("Field {0} (\"{1}\"): {2}", fieldId, fieldText, message);
            }
        }
    }

}
