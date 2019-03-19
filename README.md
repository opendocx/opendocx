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

opendocx-node exposes two methods: compileDocx() and assembleDocx(). Both are asynchronous -- that is, they return a promise rather than performing synchronously.

```javascript
async function compileDocx(templatePath)
```
compileDocx() is used to "compile" and register a template with the system. This pre-processes the template, extracting template logic into an external .js file, analyzing it for errors, and restructuring it to optimize for performance when generating documents.

```javascript
async function assembleDocx(templatePath, data, outputFile)
```
As with yatte (which shares a sommon templating engine with opendocx), data is supplied to assembleDocx as a JavaScript object:

```javascript
const yatte = require('yatte');
const assert = require('assert');

const template = "{[First]} {[if Middle]}{[Middle]} {[endif]}{[Last]}";
const data = {First: "John", Last: "Smith"};
const result = yatte.assembleText(template, data);
assert.equal(result, "John Smith");
```


