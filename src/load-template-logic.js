const fs = require('fs')

function loadTemplateLogic (templateJsFile) {
  if (!templateJsFile || !(typeof templateJsFile === 'string')) {
    throw new Error('Invalid template module: ' + templateJsFile)
  }
  if (!(templateJsFile.endsWith('.js') || templateJsFile.endsWith('.json'))) {
    throw new Error('Invalid template module filename: ' + templateJsFile)
  }
  const templateLogicFile = templateJsFile.endsWith('.js')
    ? templateJsFile + 'on'
    : templateJsFile
  if (fs.existsSync(templateLogicFile)) {
    return JSON.parse(fs.readFileSync(templateLogicFile, 'utf-8'))
  }
  throw new Error('Logic tree not found: ' + templateLogicFile)
}
module.exports = loadTemplateLogic
