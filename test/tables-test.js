// this is a simulated/sample Table type, genders, similar to the way it might be represented in the app runtime.
// Example Usage:
// suppose "Gendder" is a selection property, with genders as the option source.
// if the user chooses "Female" from the selection options, in the background, we do this:
//     let Gender = gendders["Female"];
// in expressions, the user can either refer to the state itself
//     Gendder == "Female" => true
// or they can refer to any of the option source's columns:
//     Gender.Name == "Female"
//     Gender.HeShe == "she"
// about the only thing they CAN'T do is
//     Gender === "Female"
// ... because the triple equals will return false, since Gender is not "just" a regular string.

const table = require('../table');

exports.genders = table.createTable([
	{ Name: "Male", HeShe: "he", HimHer: "him", HisHer: "his", HisHers: "his" },
	{ Name: "Female", HeShe: "she", HimHer: "her", HisHer: "her", HisHers: "hers" },
], "Name");

exports.usstates = table.createTable([
	{ Name: "Alabama", Abbr: "AL" },
	{ Name: "Alaska", Abbr: "AK" },
	{ Name: "Arizona", Abbr: "AZ" },
	{ Name: "Arkansas", Abbr: "AR" },
	{ Name: "California", Abbr: "CA" },
	{ Name: "Colorado", Abbr: "CO" },
	{ Name: "Connecticut", Abbr: "CT" },
	{ Name: "Delaware", Abbr: "DE" },
	{ Name: "District of Columbia", Abbr: "DC" },
	{ Name: "Florida", Abbr: "FL" },
	{ Name: "Georgia", Abbr: "GA" },
	{ Name: "Hawaii", Abbr: "HI" },
	{ Name: "Idaho", Abbr: "ID" },
	{ Name: "Illinois", Abbr: "IL" },
	{ Name: "Indiana", Abbr: "IN" },
	{ Name: "Iowa", Abbr: "IA" },
	{ Name: "Kansas", Abbr: "KS" },
	{ Name: "Kentucky", Abbr: "KY" },
	{ Name: "Louisiana", Abbr: "LA" },
	{ Name: "Maine", Abbr: "ME" },
	{ Name: "Maryland", Abbr: "MD" },
	{ Name: "Massachusetts", Abbr: "MA" },
	{ Name: "Michigan", Abbr: "MI" },
	{ Name: "Minnesota", Abbr: "MN" },
	{ Name: "Mississippi", Abbr: "MS" },
	{ Name: "Missouri", Abbr: "MO" },
	{ Name: "Montana", Abbr: "MT" },
	{ Name: "Nebraska", Abbr: "NE" },
	{ Name: "Nevada", Abbr: "NV" },
	{ Name: "New Hampshire", Abbr: "NH" },
	{ Name: "New Jersey", Abbr: "NJ" },
	{ Name: "New Mexico", Abbr: "NM" },
	{ Name: "New York", Abbr: "NY" },
	{ Name: "North Carolina", Abbr: "NC" },
	{ Name: "North Dakota", Abbr: "ND" },
	{ Name: "Ohio", Abbr: "OH" },
	{ Name: "Oklahoma", Abbr: "OK" },
	{ Name: "Oregon", Abbr: "OR" },
	{ Name: "Pennsylvania", Abbr: "PA" },
	{ Name: "Rhode Island", Abbr: "RI" },
	{ Name: "South Carolina", Abbr: "SC" },
	{ Name: "South Dakota", Abbr: "SD" },
	{ Name: "Tennessee", Abbr: "TN" },
	{ Name: "Texas", Abbr: "TX" },
	{ Name: "Utah", Abbr: "UT" },
	{ Name: "Vermont", Abbr: "VT" },
	{ Name: "Virginia", Abbr: "VA" },
	{ Name: "Washington", Abbr: "WA" },
	{ Name: "West Virginia", Abbr: "WV" },
	{ Name: "Wisconsin", Abbr: "WI" },
	{ Name: "Wyoming", Abbr: "WY" },
], "Name");
