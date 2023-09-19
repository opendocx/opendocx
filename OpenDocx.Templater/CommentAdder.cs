using System;
using System.Collections.Generic;
using System.Text;
using System.Linq;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;


namespace OpenDocx;

public class CommentAdder
{
    private WordprocessingDocument _doc;
    private bool _hadCommentPart;
    private int _oldMaxComment;
    private int _commentNum;
    private string _author;
    private string _initials;
    public string commentId {
        get {
            return _commentNum.ToString();
        }
    }
    private Dictionary<string, Comment> _newComments;

    public CommentAdder(WordprocessingDocument document, string author, string initials)
    {
        this._doc = document;
        this._author = author;
        this._initials = initials;
        this._newComments = new Dictionary<string, Comment>();
        this._oldMaxComment = -1;
        this._commentNum = -1;
        this._hadCommentPart = false;
        // Verify that the document contains a WordProcessingCommentsPart part
        var commentParts = this._doc.MainDocumentPart.GetPartsOfType<WordprocessingCommentsPart>();
        var commentPart = commentParts.FirstOrDefault();
        if (commentPart != null) {
            _hadCommentPart = true;
            Comments comments = commentPart.Comments;
            if (comments.HasChildren)
            {
                // Obtain an unused ID.
                this._oldMaxComment = comments.Descendants<Comment>().Select(e => int.Parse(e.Id.Value)).Max();
                this._commentNum = this._oldMaxComment;
            }
        }
    }

    public string CreateComment(string comment, string initials = null, string author = null) {
        this._commentNum++;
        // Compose a new Comment and remember it
        Paragraph p = new Paragraph(new Run(new Text(comment)));
        Comment newComment = 
            new Comment() { Id = this.commentId, 
                Author = (author == null) ? this._author : author,
                Initials = (initials == null) ? this._initials : initials,
                Date = DateTime.Now };
        newComment.AppendChild(p);
        // comments.AppendChild(cmt);
        // comments.Save();
        _newComments[this.commentId] = newComment;
        return this.commentId;
    }

    public void SaveComments() {
        if (this._newComments.Any()) {
            Comments comments = null;
            if (this._hadCommentPart) {
                var commentParts = this._doc.MainDocumentPart.GetPartsOfType<WordprocessingCommentsPart>();
                var commentPart = commentParts.FirstOrDefault();
                comments = commentPart.Comments;
            } else {
                // No WordprocessingCommentsPart part exists, so add one to the package.
                var commentPart = this._doc.MainDocumentPart.AddNewPart<WordprocessingCommentsPart>();
                commentPart.Comments = new Comments();
                comments = commentPart.Comments;
            }
            foreach (var newComment in this._newComments.Values) {
                comments.AppendChild(newComment);
            }
            comments.Save();
        }
    }
}
