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
    public class FieldParseException : Exception
    {
        public FieldParseException() { }
        public FieldParseException(string message) : base(message) { }
        public FieldParseException(string message, Exception inner) : base(message, inner) { }
    }

}
