const version = require('./version')
const semver = require('semver')

function loadTemplateModule (templateJsFile) {
  const thisVers = semver.major(version) + '.' + semver.minor(version)
  const extractedLogic = require(templateJsFile)
  const loadedVers = extractedLogic.version
  if (loadedVers && (semver.eq(version, loadedVers) || semver.satisfies(loadedVers, thisVers))) {
    return extractedLogic
  } // else
  // invalidate loaded module with incorrect version!
  delete require.cache[require.resolve(templateJsFile)]
  throw new Error(`Version mismatch: Expecting template JavaScript version ${thisVers}.x, but JS file is version ${
    loadedVers}`)
}
module.exports = loadTemplateModule
