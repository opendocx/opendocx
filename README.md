opendocx-node
=============

**Document and text assembly using [OpenDocx](https://github.com/opendocx/opendocx) for Node.js applications.**

This package is still very much experimental in nature. If it interests you, please try it out and share your feedback.

opendocx-node facilitates "document assembly": a template-based approach to automatically generating documents.  At this point, templates are expected to either be DOCX files (on disk) or plain text strings.  The same set of template features can be applied to either kind of template.

Installation
------------

[![NPM](https://nodei.co/npm/opendocx-node.png)](https://nodei.co/npm/opendocx-node/)

Templates
---------

Template markup is accomplished using "fields" to describe how the document content and structure should be modified when documents are being assembled. OpenDocx currently supports three types of fields: Content, Conditional, and Repeat. Simples (and additional types of fields!) are coming soon.

When using Word DOCX files as templates, fields are placed inside Word content controls. Inside the content control, a field is visually delimited with square brackets.

When assembling plain text, curly braces take the place of the content controls, but inside the curly braces, the syntax is identical to what it is in Word templates. (Including the square bracketes!) This means, templates in plain text look like {\[this]}.

**Content** fields cause text to be added (merged) into the document.
```
{[First]} {[Last]}
```

**Conditional** fields cause a portion of the document to be included (or excluded) based on logical conditions.
```
{[First]} {[if Middle]}{[Middle]} {[endif]}{[Last]}
```

Conditionals can also include alternatives ("else") or chains of alternatives ("elseif").

**Repeat** fields cause text to be repeated as many times as is dictated by the data you provide to assemble a document. Repeats can be nested as deeply as necessary.

Usage
-----

opendocx-node exposes two methods: registerTemplate() and assembleDocument(). Both are asynchronous -- that is, they return a promise rather than performing synchronously.

registerTemplate() is used to "register" a template. This pre-processes the template, analyzing it for errors and restructuring it to optimize for performance when generating documents -- which is what assembleDocument() does.  Calling registerTemplate is currently optional; if you do not register a template prior to calling assembleDocument, the template will go through that pre-processing at the time you call assembleDocument.

Templates are supplied to registerTemplate and assembleDocument as strings.  If the string ends in ".docx", it is assumed to be the path to a DOCX file on disk.  Otherwise it is assumed to be a plain text string that should be assembled.  This "hackish" approach will change in the future.  (Sorry.)

Data is supplied to assembleDocument as a JavaScript object:

```javascript
const openDocx = require('opendocx-node');
const assert = require('assert');

const template = "{[First]} {[if Middle]}{[Middle]} {[endif]}{[Last]}";
const data = {First: "John", Last: "Smith"};
const result = await openDocx.assembleDocument(template, data);
assert.equal(result, "John Smith");
```


