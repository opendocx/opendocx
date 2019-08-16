'use strict';

let atomStore = {};
let atomSeed = 0;

module.exports = function(str) {
    if (str==='###reset###') {
        atomSeed = 0;
        atomStore = {};
        return;
    }
    if (str===null) {
        throw "Unexpected: cannot atomize a null string"
    }
    var result = atomStore[str];
    if (typeof result == 'string') return result;
    // else
    result = base52(atomSeed++);
    atomStore[str] = result;
    return result;
}

const alpha = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const alphaLen = alpha.length;
const base52 = function (num) {
    let result = '';
    while (num > 0) {
        let index = num % alphaLen;
        result = alpha.charAt(index) + result;
        num = (num - index) / alphaLen;
    }
    return result || 'a';
}
