/***************************************************************************

Copyright (c) Lowell Stewart 2018-2019.
Licensed under the Mozilla Public License. See LICENSE file in the project root for full license information.

Published at https://github.com/opendocx/opendocx
Developer: Lowell Stewart
Email: lowell@opendocx.com

***************************************************************************/

using System.Collections.Generic;
using System.Threading.Tasks;
using System.IO;
using Newtonsoft.Json;

namespace OpenDocx
{
    public class Templater
    {
        #pragma warning disable CS1998
        public async Task<object> CompileTemplateAsync(dynamic input)
        {
            var preProcessedTemplateFile = (string)input.templateFile;
            var originalTemplateFile = (string)input.originalTemplateFile;
            var parsedFieldInfoFile = (string)input.fieldInfoFile;
            await Task.Yield();
            return CompileTemplate(originalTemplateFile, preProcessedTemplateFile, parsedFieldInfoFile);
        }
        #pragma warning restore CS1998

        public CompileResult CompileTemplate(string originalTemplateFile, string preProcessedTemplateFile, string parsedFieldInfoFile)
        {
            string json = File.ReadAllText(parsedFieldInfoFile);
            var xm = JsonConvert.DeserializeObject<FieldTransformIndex>(json);
            // translate xm into a simple Dictionary<string, string> so we can use basic TemplateTransformer
            // instead of the former custom implementation
            var fieldMap = new FieldReplacementIndex();
            foreach (var fieldId in xm.Keys) {
                fieldMap[fieldId] = new FieldReplacement(xm[fieldId]);
            }
            string destinationTemplatePath = originalTemplateFile + "gen.docx";
            var errors = TemplateTransformer.TransformTemplate(preProcessedTemplateFile,
                destinationTemplatePath, TemplateFormat.ObjectDocx, fieldMap);
            return new CompileResult(destinationTemplatePath, errors);
        }
    }
}
