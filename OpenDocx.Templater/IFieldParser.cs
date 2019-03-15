/***************************************************************************

Copyright (c) Lowell Stewart 2018-2019.
Licensed under the Mozilla Public License. See LICENSE file in the project root for full license information.

Published at https://github.com/opendocx/opendocx
Developer: Lowell Stewart
Email: lowell@opendocx.com

***************************************************************************/

using System;
using System.Threading.Tasks;
using System.Xml.Linq;

namespace OpenDocx
{
    public interface IFieldParser
    {
        string DelimiterOpen { get; }
        string DelimiterClose { get; }
        string EmbedOpen { get; }
        string EmbedClose { get; }
        XElement ParseField(string content);
    }

    public interface IAsyncFieldParser: IFieldParser
    {
        Task<XElement> ParseFieldAsync(string content);
    }

    public class FieldParseException : Exception
    {
        public FieldParseException() { }
        public FieldParseException(string message) : base(message) { }
        public FieldParseException(string message, Exception inner) : base(message, inner) { }
    }

}
