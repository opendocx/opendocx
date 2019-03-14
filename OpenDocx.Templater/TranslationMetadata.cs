using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace OpenDocx
{
    public static class Gen
    {
        private static readonly char[] BaseChars =
         "aAbBcCdDeEfFgGhHiIjJkKlLmMnNoOpPqQrRsStTuUvVwWxXyYzZ".ToCharArray();
        private static readonly Dictionary<char, int> CharValues = BaseChars
                   .Select((c, i) => new { Char = c, Index = i })
                   .ToDictionary(c => c.Char, c => c.Index);
        private static long _num = 0;
        public static string ID { get => LongToBase(_num++); }
        public static void Reset() { _num = 0; }

        private static string LongToBase(long value)
        {
            long targetBase = BaseChars.Length;
            // Determine exact number of characters to use.
            char[] buffer = new char[Math.Max(
                       (int)Math.Ceiling(Math.Log(value + 1, targetBase)), 1)];

            var i = buffer.Length;
            do
            {
                buffer[--i] = BaseChars[value % targetBase];
                value = value / targetBase;
            }
            while (value > 0);

            return new string(buffer, i, buffer.Length - i);
        }
    }

    public class TranslationMetadata
    {
        private Dictionary<string, string> _symbols = new Dictionary<string, string>();
        private Stack<TranslationStackFrame> _stack = new Stack<TranslationStackFrame>();
        private StringBuilder _func = new StringBuilder();
        
        public TranslationMetadata(string rootObjectName)
        {
            Gen.Reset();
            WriteLine("'use strict';");
            WriteLine("exports.evaluate = function(context, writer)");
            BeginObject(rootObjectName, "context");
        }

        public string GetFunc()
        {
            if (_stack.Count > 1)
            {
                StringBuilder stackMessage = new StringBuilder();
                foreach (var frame in _stack)
                {
                    stackMessage.Append(string.Format("Frame type = {0}, Name = {1}\n", frame.Type.ToString(), frame.Name));
                }
                throw new InvalidOperationException("Internal error: cannot retrieve function while inside conditional or loop\n" + stackMessage.ToString());
            }
            if (_stack.Count == 1)
            {
                EndObject();
            }
            return _func.ToString();
        }

        private string LookupExprInScope(string expr)
        {
            bool first = true;
            string symbol = null;
            string lookInContext = null;
            foreach (var frame in _stack)
            {
                if (first)
                {
                    first = false;
                    lookInContext = frame.ContextName;
                }
                if (frame.ContextName != lookInContext)
                {
                    symbol = null;
                    break;
                }
                if (frame.TryLookupSymbol(expr, out symbol))
                    break;
            }
            return symbol;
        }

        private void Write(string format, params object[] args)
        {
            if (!string.IsNullOrEmpty(format))
                _func.AppendFormat(format, args);
        }

        private void WriteLine(int indent, string format, params object[] args)
        {
            Write(format, args);
            _func.AppendLine();
        }

        private void WriteLine(string format, params object[] args)
        {
            WriteLine(0, format, args);
        }

        private void BeginObject(string name, string contextName)
        {
            var stackFrame = new TranslationStackFrame(ContextType.Object, name, contextName);
            _stack.Push(stackFrame);
            WriteLine("{{");
            WriteLine("writer.beginObject('{0}', {1});", name, contextName);
        }

        private void EndObject()
        {
            if (_stack.Peek().Type != ContextType.Object)
                throw new InvalidOperationException("Internal Error: Cannot EndObject from this context");
            WriteLine("writer.endObject()");
            WriteLine("}}");
            _stack.Pop();
        }

        private void DefineChecks()
        {
            if (_stack.Count == 0)
                throw new InvalidOperationException("Cannot define property on empty stack");
            if (_stack.Peek().Type == ContextType.List)
                throw new InvalidOperationException("Internal error: define, list or conditional not expected in list context");
        }

        public string DefineProperty(string expr)
        {
            // called when we encounter a merge field when compiling the template
            // returns the XPath query for that merge field
            DefineChecks();
            string name = LookupExprInScope(expr);
            if (name == null)
            {
                name = Gen.ID;
                WriteLine("writer.define('{0}', '{1}');", name, expr);
                _stack.Peek().DefineSymbol(name, expr);
            }
            return "./" + name;
        }

        public string BeginList(string expr)
        {
            // called when we encounter a list field when compiling the template
            // returns the XPath query for that list
            // note: we never look up lists in the current scope, because there's no guarantee
            // that prior instances of the same list included all properties that this one will include!
            // (consider maybe doing this differently if it's too problematic)
            DefineChecks();
            string name = Gen.ID;
            string id = name + "0";
            WriteLine("for(const {0} of writer.beginList('{1}', '{2}'))", id, name, expr);
            var stackFrame = new TranslationStackFrame(ContextType.List, name, _stack.Peek().ContextName);
            _stack.Push(stackFrame);

            BeginObject(id, id);
            return "./" + name + "/" + id;
        }

        public void EndList()
        {
            EndObject();
            if (_stack.Peek().Type != ContextType.List)
                throw new InvalidOperationException("Internal Error: Cannot EndList from this context");
            _stack.Pop();
            WriteLine("writer.endList();");
        }

        public string BeginIf(string expr)
        {
            // called when we encounter an if field when compiling the template
            // returns the XPath query for that if field
            DefineChecks();
            string name = LookupExprInScope(expr);
            bool defining = false;
            if (name == null)
            {
                name = Gen.ID;
                defining = true;
                _stack.Peek().DefineSymbol(name, expr);
            }
            WriteLine("if(writer.defineCondition('{0}', '{1}', {2}))", name, expr, defining ? "true" : "false");
            WriteLine("{{");
            var stackFrame = new ConditionalStackFrame(name, _stack.Peek());
            _stack.Push(stackFrame);
            return "./" + name;
        }

        public string Else()
        {
            var frame = _stack.Peek() as ConditionalStackFrame;
            if (frame == null)
                throw new InvalidOperationException("Internal error: Else called outside of conditional stack frame");
            frame.ElseEncountered = true;
            WriteLine("}} else {{");
            return "./" + frame.Name;
        }

        public void EndIf()
        {
            if (_stack.Peek().Type != ContextType.Conditional)
                throw new InvalidOperationException("Internal Error: Cannot EndIf from this context");
            _stack.Pop();
            WriteLine("}}");
        }

        enum ContextType { Object, List, Conditional }

        class ExpressionInstance
        {
            public string _expression { get; }
            List<Condition> _conditions { get; }
            public ExpressionInstance(string expression, List<Condition> conditions)
            {
                _expression = expression;
                _conditions = conditions;
            }
        }

        class Condition
        {
            public string _expression { get; }
            public string _context { get; }
            public bool _not { get; }
            public Condition(string expression, string context, bool not )
            {
                _expression = expression;
                _context = context;
                _not = not;
            }
        }

        class TranslationStackFrame
        {
            public ContextType Type { get; }
            
            public string Name { get; }
            public string ContextName { get; }
            protected Dictionary<string, string> _symbols;

            public bool TryLookupSymbol(string name, out string symbol) => _symbols.TryGetValue(name, out symbol);
            public void DefineSymbol(string name, string expr) => _symbols.Add(expr, name);

            public TranslationStackFrame(ContextType type, string name, string contextName)
            {
                Type = type;
                Name = name;
                ContextName = contextName;
                _symbols = new Dictionary<string, string>();
            }

            public TranslationStackFrame(ContextType type, string name, TranslationStackFrame parent) : this(type, name, parent.ContextName)
            {
                System.Diagnostics.Debug.Assert(type == ContextType.Conditional);
                System.Diagnostics.Debug.Assert(parent.Type == ContextType.Object);
            }
        }

        class ConditionalStackFrame : TranslationStackFrame
        {
            private bool _elseEncountered;
            public bool ElseEncountered
            {
                get => _elseEncountered;
                set {
                    if (_elseEncountered)
                        throw new InvalidOperationException("Else has already been encountered");
                    if (value)
                    {
                        _elseEncountered = value;
                        _symbols.Clear();
                    }
                }
            }
            public ConditionalStackFrame(string name, TranslationStackFrame parent) : base(ContextType.Conditional, name, parent)
            {
                _elseEncountered = false;
            }
        }
    }

}
