"use strict";

class ContextStack {
    constructor () {
        this.stack = [];
    }

    empty () {
        return this.stack.length == 0;
    }
    pushObject (name, contextObj) {
        let currentFrame = this.peek();
        if (currentFrame && currentFrame.type == "List") {
            this.push(createListItemFrame(name, contextObj, currentFrame));
        } else {
            this.push(createObjectFrame(name, contextObj, currentFrame));
        }
    }
    popObject () {
        const poppedFrame = this.pop();
        if (poppedFrame.type != 'Object')
            throw `Internal error: expected Object stack frame, got ${poppedFrame.type} instead`;
        return poppedFrame;
    }
    pushList (name, iterable) {
        let newFrame = createListFrame(name, iterable, this.peek());
        this.push(newFrame);
        return indices(newFrame.array.length);
    }
    popList() {
        const poppedFrame = this.pop();
        if (poppedFrame.type != 'List')
            throw `Internal error: expected List stack frame, got ${poppedFrame.type} instead`;
        return poppedFrame;
    }
    push (frame) {
        this.stack.push(frame);
    }
    pop () {
        return this.stack.pop();
    }
    peek () {
        return this.stack.length > 0 ? this.stack[this.stack.length-1] : null;
    }
    peekName() {
        return this.peek().name;
    }

    static IsTruthy(value) {
        let bValue;
        if (value && ContextStack.IsIterable(value)) {
            // checking if a list is empty or not
            if (!ContextStack.IsArray(value)) {
                value = Array.from(value)
            }
            bValue = (value.length > 0) // for purposes of if fields in opendocx, we consider empty lists falsy! (unlike typical JavaScript, where all arrays are considered truthy)
        } else {
            bValue = Boolean(value);
        }
        return bValue;
    }

    static IsArray(obj) {
        return Array.isArray(obj)
    }

    static IsIterable(obj) {
        // checks for null and undefined; also strings (though iterable) should not be iterable *contexts*
        if (obj == null || typeof obj == 'string') {
            return false
        }
        return typeof obj[Symbol.iterator] === 'function'
    }
}
module.exports = ContextStack;

const indices = (length) => new Array(length).fill(undefined).map((value, index) => index)

function createObjectFrame (name, contextObj, parentFrame) {
    var context = Object.create(contextObj);
    Object.defineProperties(context, {
        _parent: { value: parentFrame ? parentFrame.context : null },
    });
    return { type: 'Object', name: name, context: context, parentFrame: parentFrame };
}

function createListFrame (name, iterable, parentFrame) {
    const array = iterable ? Array.from(iterable) : [];
    return { type: 'List', name: name, array: array, parentFrame: parentFrame };
}

function createListItemFrame (name, index, listFrame) {
    var itemBaseContext = listFrame.array[index];
    var itemContext = (typeof itemBaseContext == "object") ? Object.create(itemBaseContext) : wrapPrimitive(itemBaseContext);
    Object.defineProperties(itemContext, {
        _index0: { value: index },
        _index: { value: index + 1 },
        _parent: { value: listFrame.parentFrame.context },
    });
    return { type: 'Object', name: name, context: itemContext, listFrame: listFrame };
}

function wrapPrimitive(value) {
    let val;
    switch (typeof value) {
        case 'string': val = new String(value); break;
        case 'number': val = new Number(value); break;
        case 'boolean': val = new Boolean(value); break;
        default: throw 'unexpected value type';
    }
    return val;
}