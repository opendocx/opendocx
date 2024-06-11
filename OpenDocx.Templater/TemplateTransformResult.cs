using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace OpenDocx
{
    public class TemplateTransformResult
    {
        public byte[] Bytes { get; }
        public string[] Errors { get; }
        public bool HasErrors { get => Errors != null && Errors.Length > 0; }

        public TemplateTransformResult(byte[] bytes, string[] errors) { Bytes = bytes; Errors = errors; }
    }
}
