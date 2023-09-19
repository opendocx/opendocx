/***************************************************************************

Copyright (c) Lowell Stewart 2021-2023.
Licensed under the Mozilla Public License. See LICENSE file in the project root for full license information.

Published at https://github.com/opendocx/opendocx
Developer: Lowell Stewart
Email: lowell@opendocx.com

***************************************************************************/

using System.Collections.Generic;
using System.Threading.Tasks;
using System.IO;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace OpenDocx
{
    public class CCRemover
    {
        #pragma warning disable CS1998
        public async Task<object> RemoveCCsAsync(dynamic input)
        {
            var preProcessedTemplateFile = (string)input.templateFile;
            var originalTemplateFile = (string)input.originalTemplateFile;
            await Task.Yield();
            return RemoveCCs(originalTemplateFile, preProcessedTemplateFile);
        }
        #pragma warning restore CS1998

        public CompileResult RemoveCCs(string originalTemplateFile, string preProcessedTemplateFile)
        {
            string json = File.ReadAllText(originalTemplateFile + "obj.json");
            var val = JsonConvert.DeserializeObject<JArray>(json);
            // build field map
            var fieldMap = new FieldReplacementIndex();
            foreach (JObject obj in FlattenFields(val)) {
                var fieldId = (string)obj["id"];
                //var content = (string)obj["content"];
                var content = "=:" + fieldId + ":=";
                fieldMap[fieldId] = new FieldReplacement(content);
            }
            // perform field replacement
            string destinationTemplatePath = originalTemplateFile + "ncc.docx";
            var errors = TemplateTransformer.TransformTemplate(preProcessedTemplateFile,
                destinationTemplatePath, TemplateFormat.PreviewDocx, fieldMap);
            return new CompileResult(destinationTemplatePath, errors);
        }

        public static IEnumerable<JToken> FlattenFields(JToken item) {
            if (item.Type == JTokenType.Array) {
                foreach (var element in item) {
                    foreach (var subElement in FlattenFields(element)) {
                        yield return subElement;
                    }
                }
            } else {
                yield return item;
            }
        }
    }
}
