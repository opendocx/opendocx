const fs = require('fs')

function loadTemplateLogic (templateJsFile) {
  if (!templateJsFile || !(typeof templateJsFile === 'string') || !templateJsFile.endsWith('.js')) {
    throw new Error('Invalid template module filename: ' + templateJsFile)
  }
  const templateLogicFile = templateJsFile + 'on'
  if (fs.existsSync(templateLogicFile)) {
    return JSON.parse(fs.readFileSync(templateLogicFile, 'utf-8'))
  }
  throw new Error('Logic tree not found: ' + templateLogicFile)
}
module.exports = loadTemplateLogic
