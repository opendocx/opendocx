const fs = require('fs');
const path = require('path');
require('./hooks'); // ensure hooks get loaded, even when running selected suites or tests

exports.FileNameAppend = function(pathToFile, stringToAppend) {
    const pathObj = path.parse(pathToFile);
    delete pathObj.base;
    pathObj.name += stringToAppend;
    return path.format(pathObj);
}

exports.GetTemplatePath = function(testTemplateName) {
    const templatePath = path.join(testOutputDir, testTemplateName);
    if (!fs.existsSync(templatePath)) {
        fs.copyFileSync(path.join(__dirname, 'templates', testTemplateName), templatePath);
    }
    return templatePath;
}