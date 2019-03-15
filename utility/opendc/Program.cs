using System;
using System.Dynamic;
using System.Diagnostics;
using System.Threading.Tasks;
using System.IO;
using System.Text;
using OpenDocx;
using OpenXmlPowerTools;
using System.Runtime.InteropServices;

namespace opendc
{
    class Program
    {
        static void Main(string[] args)
        {
            if (args.Length < 2)
            {
                Usage();
                return;
            }

            switch (args[0].ToLower())
            {
                case "compile":
                    Compile(args[1]);
                    break;
                case "data":
                    GetData(args[1]);
                    break;
                case "assemble":
                    Assemble(args[1], args[2]);
                    break;
                default:
                    Console.WriteLine("unexpected argument: {0}", args[1]);
                    Usage();
                    break;
            }
        }

        static void Compile(string templatePath)
        {
            string fullPath = Path.GetFullPath(templatePath);
            //string templateDir = Path.GetDirectoryName(fullPath);
            var templater = new OpenDocx.Templater();
            var result = templater.CompileTemplate(fullPath);
            Console.WriteLine("DocxGenTemplate={0}", result.DocxGenTemplate);
            Console.WriteLine("ExtractedLogic={0}", result.ExtractedLogic);
            Console.WriteLine("HasErrors={0}", result.HasErrors ? @"true" : @"false");
        }

        private static void Assemble(string compiledTemplatePath, string documentPath)
        {
            var templater = new OpenDocx.Templater();
            var result = templater.AssembleDocument(compiledTemplatePath, Console.In, documentPath);
            Console.WriteLine("Document={0}", result.Document);
            Console.WriteLine("HasErrors={0}", result.HasErrors);
        }

        private static void GetData(string jsFilePath)
        {
            string htmlFull = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "getdata.html");
            string url = FilePathToFileUrl(htmlFull) + "/test";
            Console.WriteLine("attempting to open " + url);
            OpenUrl(url);
        }

        private static void LaunchFileInBrowser(string fileName, string paramName, string paramFile)
        {
            string fileUrl = FilePathToFileUrl(Path.GetFullPath(fileName));
            string paramUrl = FilePathToFileUrl(Path.GetFullPath(paramFile)).Substring(7); // omit the "file://" at the beginning
            string fullUrl = fileUrl + "?" + paramName + "=" + Uri.EscapeDataString(paramUrl);
            OpenUrl(fullUrl);
        }

        // from https://stackoverflow.com/a/43232486
        private static void OpenUrl(string url)
        {
            try
            {
                Process.Start(url);
            }
            catch
            {
                // hack because of this: https://github.com/dotnet/corefx/issues/10361
                if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
                {
                    url = url.Replace("&", "^&");
                    Process.Start(new ProcessStartInfo("cmd", $"/c start {url}") { CreateNoWindow = true });
                }
                else if (RuntimeInformation.IsOSPlatform(OSPlatform.Linux))
                {
                    Process.Start("xdg-open", url);
                }
                else if (RuntimeInformation.IsOSPlatform(OSPlatform.OSX))
                {
                    Process.Start("open", url);
                }
                else
                {
                    throw;
                }
            }
        }

        // from https://stackoverflow.com/a/35734486
        private static string FilePathToFileUrl(string filePath)
        {
            StringBuilder uri = new StringBuilder();
            foreach (char v in filePath)
            {
                if ((v >= 'a' && v <= 'z') || (v >= 'A' && v <= 'Z') || (v >= '0' && v <= '9') ||
                  v == '+' || v == '/' || v == ':' || v == '.' || v == '-' || v == '_' || v == '~' ||
                  v > '\xFF')
                {
                    uri.Append(v);
                }
                else if (v == Path.DirectorySeparatorChar || v == Path.AltDirectorySeparatorChar)
                {
                    uri.Append('/');
                }
                else
                {
                    uri.Append(String.Format("%{0:X2}", (int)v));
                }
            }
            if (uri.Length >= 2 && uri[0] == '/' && uri[1] == '/') // UNC path
                uri.Insert(0, "file:");
            else
                uri.Insert(0, "file:///");
            return uri.ToString();
        }

        private static void Usage()
        {
            Console.WriteLine("opendc - OpenDocx Template Compilation and Document Assembly");
            Console.WriteLine();
            Console.WriteLine("Usage Scenarios");
            Console.WriteLine("============================================================");
            Console.WriteLine();
            Console.WriteLine("Compile an OpenDocx template:");
            Console.WriteLine();
            Console.WriteLine("   opendc.exe compile <templatePath>");
            Console.WriteLine();
            Console.WriteLine("   Output:");
            Console.WriteLine("      DocxGenTemplate=<compiledTemplatePath>");
            Console.WriteLine("      ExtractedLogic=<jsFilePath>");
            Console.WriteLine("      HasErrors=<true|false>");
            Console.WriteLine();
            Console.WriteLine("Get XML data:");
            Console.WriteLine("  Unfortunately this command-line tool does not currently do that.");
            Console.WriteLine("  So using document assembly (below) is not too practical.");
            //Console.WriteLine();
            //Console.WriteLine("   opendc.exe data <jsFilePath>");
            Console.WriteLine();
            Console.WriteLine("Assemble a document from a compiled OpenDocx template and extracted XML data:");
            Console.WriteLine();
            Console.WriteLine("   opendc.exe assemble <compiledTemplatePath> <outputPath> < data.xml");
            Console.WriteLine();
            Console.WriteLine("   Note that xml data is fed through STDIN, either using < or |.");
            Console.WriteLine("   Output:");
            Console.WriteLine("      Document=<assembledDocumentPath>");
            Console.WriteLine("      HasErrors=<true|false>");
        }
    }
}
