using System;
using System.Collections.Generic;
using System.Linq;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using System.Diagnostics.CodeAnalysis;
using System.Collections;

namespace OpenDocx;

public class CommentReader : IReadOnlyDictionary<string, string>
{
    private WordprocessingDocument _doc;
    private Dictionary<string, Comment> _comments;

    public IEnumerable<string> Keys => _comments.Keys;
    public IEnumerable<string> Values => _comments.Values.Select(c => c.InnerText);
    public int Count => _comments.Count;
    public string this[string key] => _comments[key].InnerText;

    public CommentReader(WordprocessingDocument document)
    {
        this._doc = document;
        this._comments = new Dictionary<string, Comment>();
        // Verify that the document contains a WordProcessingCommentsPart part
        var commentParts = this._doc.MainDocumentPart.GetPartsOfType<WordprocessingCommentsPart>();
        var commentPart = commentParts.FirstOrDefault();
        if (commentPart != null) {
            Comments comments = commentPart.Comments;
            if (comments.HasChildren)
            {
                foreach (Comment comment in comments.Elements<Comment>())
                {
                    _comments[comment.Id.Value] = comment;
                }
            }
        }
    }

    public bool ContainsKey(string key)
    {
        return _comments.ContainsKey(key);
    }

    public bool TryGetValue(string key, [MaybeNullWhen(false)] out string value)
    {
        if (_comments.TryGetValue(key, out var comment)) {
            value = comment.InnerText;
            return true;
        }
        value = null;
        return false;
    }

    public IEnumerator<KeyValuePair<string, string>> GetEnumerator()
    {
        foreach (var pair in _comments) {
            yield return new KeyValuePair<string, string>(pair.Key, pair.Value.InnerText);
        }
    }

    IEnumerator IEnumerable.GetEnumerator()
    {
        return GetEnumerator();
    }
}
