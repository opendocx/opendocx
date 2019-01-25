/***************************************************************************

Copyright (c) Lowell Stewart 2018-2019.

This code is licensed using the Microsoft Public License (Ms-PL).  The text of the license can be found here:

http://www.microsoft.com/resources/sharedsource/licensingbasics/publiclicense.mspx

Published at https://github.com/lowellstewart/opendocx

Developer: Lowell Stewart
Email: lowell@opendocx.com

***************************************************************************/

using System;
using System.Collections;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.IO;

namespace OpenDocx
{
    public class Templater : DocumentAssemblerBase
    {
        public async Task<object> AssembleAsync(dynamic input)
        {
            Console.WriteLine("DN: OpenDocx.Templater.AssembleAsync invoked");
            var templateFile = (string)input.templateFile + ".preprocessed";
            var dataSource = new NodeDataContext(input);
            if (!File.Exists(templateFile))
                throw new FileNotFoundException("Preprocessed version of template does not exist", templateFile);
            WmlDocument templateDoc = new WmlDocument(templateFile); // reads the template's bytes into memory
            var asmResult = await AssembleDocumentAsync(templateDoc, @"c:\temp\test_output.docx", dataSource, true);
            if (asmResult.HasErrors)
            {
                Console.WriteLine("Errors in template.");
                Console.WriteLine("See {0} to determine the errors in the template.", asmResult.Document.FileName);
            }
            // save the output (even in the case of error, since error messages are in the file)
            asmResult.Document.Save(); // write the in-memory copy out to disk

            Console.WriteLine("DN: OpenDocx.Templater.AssembleAsync returning");
            return !asmResult.HasErrors; // todo: return the document somehow
        }

        public async Task<object> PreProcessAsync(dynamic input)
        {
            Console.WriteLine("DN: OpenDocx.Templater.PreProcessAsync invoked");
            var templateFile = (string)input.templateFile;
            var fieldParser = new MetadataParser();
            WmlDocument templateDoc = new WmlDocument(templateFile); // just reads the template's bytes into memory (that's all), read-only
            Console.WriteLine("DN: OpenDocx.Templater.PreProcessAsync initialized with template '{0}'", templateFile);

            var result = await CompileTemplateAsync(templateDoc, templateFile, fieldParser);
            if (result.HasErrors)
            {
                Console.WriteLine("Errors in template.");
                Console.WriteLine("See {0} to determine the errors in the template.", result.CompiledTemplate.FileName);
            }
            // save the output (even in the case of error, since error messages are in the file)
            result.CompiledTemplate.Save(); // write the in-memory copy out to disk

            Console.WriteLine("DN: OpenDocx.Templater.PreProcessAsync returning");
            return null; // todo: return the pre-processed template somehow
        }
    }
}
