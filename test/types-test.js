// simulation/fake illustrating (ish) kind of how the app engine might "smarten up" dumb JSON objects
// using information specified in Types

const fakeTables = require('./tables-test');
const usstates = fakeTables.usstates;
const genders = fakeTables.genders;
const dateParse = require('date-fns/parse');

function estate_plan (inputObj) {
    if (inputObj.hasOwnProperty('Testator')) party(inputObj.Testator);
    if (inputObj.hasOwnProperty('Representatie')) party(inputObj.Representative);
    if (inputObj.hasOwnProperty('BackupRepresentative')) party(inputObj.BackupRepresentative);
    //if (inputObj.hasOwnProperty('Beneficiaries')) _list(inputObj.Beneficiaries);
    if (inputObj.hasOwnProperty('SigningDate')) inputObj.SigningDate = dateParse(inputObj.SigningDate);
    if (inputObj.hasOwnProperty('GoverningLaw')) inputObj.GoverningLaw = usstates[inputObj.GoverningLaw];
}
exports.estate_plan = estate_plan;

function party (inputObj) {
    if (inputObj.hasOwnProperty('Gender')) inputObj.Gender = genders[inputObj.Gender];
    if (inputObj.hasOwnProperty('State')) inputObj.State = usstates[inputObj.State];
}

function child(inputObj) {
    if (inputObj.hasOwnProperty('Birthdate')) inputObj.Birthdate = dateParse(inputObj.Birthdate);
}
exports.child = child;

function _list_of(type, inputArray) {
    for (const item of inputArray) {
        type(item);
    }
}
exports._list_of = _list_of;
