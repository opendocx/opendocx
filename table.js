// table.js

exports.createTable = function (objArray, keyPropName) {
    let lookup = {};
    for (obj of objArray) {
        let key = obj[keyPropName];
        let val;
        switch (typeof key) {
            case "string": val = new String(key); break;
            case "number": val = new Number(key); break;
            case "boolean": val = new Boolean(key); break;
            default: throw "unexpected key type";
        }
        for (const [k, v] of Object.entries(obj)) {
            //todo: figure out what to do about different types of value here? dates? functions? what do we expect?
            Object.defineProperty(val, k, {value: v});
        }
        lookup[key] = val;
    }
    return lookup;
}

