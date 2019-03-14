using System;
using System.Threading.Tasks;

namespace OpenDocx
{
    public interface IDataContext : IFieldParser
    {
        string EvaluateText(string selector, bool optional);
        bool EvaluateBool(string selector, string match, string notMatch);
        IDataContext[] EvaluateList(string selector, bool optional);
        void Release();
    }

    public interface IAsyncDataContext : IAsyncFieldParser
    {
        Task<string> EvaluateTextAsync(string selector, bool optional);
        Task<bool> EvaluateBoolAsync(string selector, string match, string notMatch);
        Task<IAsyncDataContext[]> EvaluateListAsync(string selector, bool optional);
        Task ReleaseAsync();
    }

    public class EvaluationException : Exception
    {
        public EvaluationException() { }
        public EvaluationException(string message) : base(message) { }
        public EvaluationException(string message, Exception inner) : base(message, inner) { }
    }

}
