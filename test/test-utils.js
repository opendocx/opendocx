const fs = require('fs')
const path = require('path')
require('./hooks') // ensure hooks get loaded, even when running selected suites or tests

exports.FileNameAppend = function (pathToFile, stringToAppend) {
  const pathObj = path.parse(pathToFile)
  delete pathObj.base
  pathObj.name += stringToAppend
  return path.format(pathObj)
}

exports.GetTemplatePath = function (testTemplateName) {
  const templatePath = path.join(testOutputDir, path.basename(testTemplateName))
  if (!fs.existsSync(templatePath)) {
    fs.copyFileSync(path.join(__dirname, 'templates', testTemplateName), templatePath)
  }
  return templatePath
}

exports.GetTemplateNetPath = function (testTemplateName) {
  const origPath = path.join(__dirname, 'templates', testTemplateName)
  const dotNetTestPath = path.join(__dirname, 'history', 'dot-net-results')
  if (!fs.existsSync(dotNetTestPath)) {
    fs.mkdirSync(dotNetTestPath, { recursive: true })
  }
  const destPath = path.join(dotNetTestPath, testTemplateName)
  if (!fs.existsSync(destPath) || filesAppearToDiffer(origPath, destPath)) {
    fs.copyFileSync(origPath, destPath)
  }
  return destPath
}

function filesAppearToDiffer (file1, file2) {
  const { mtime: mtime1, size: size1 } = fs.statSync(file1)
  const { mtime: mtime2, size: size2 } = fs.statSync(file2)
  return ((size1 !== size2) || (mtime1.valueOf() !== mtime2.valueOf()))
}
