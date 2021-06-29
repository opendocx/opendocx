'use strict'

const spawn = require('child_process').spawn

const command = 'pandoc'

const pandoc = (from, to, ...args) => {
  const options = ['-f', from, '-t', to].concat(args)

  const converter = (src, referenceDoc = undefined) => new Promise((resolve, reject) => {
    const proc = spawn(command, referenceDoc ? options.concat(`--reference-doc=${referenceDoc}`) : options)
    proc.on('error', reject)
    const data = []
    proc.stdout.on('data', chunk => {
      data.push(chunk)
    })
    proc.stdout.on('end', () => resolve(Buffer.concat(data)))
    proc.stdout.on('error', reject)
    proc.stdin.write(src)
    proc.stdin.end()
  })

  converter.stream = (srcStream, referenceDoc = undefined) => {
    const proc = spawn(command, referenceDoc ? options.concat(`--reference-doc=${referenceDoc}`) : options)
    srcStream.pipe(proc.stdin)
    return proc.stdout
  }

  return converter
}

const docxToMarkdown = pandoc('docx', 'markdown')
const markdownToDocx = pandoc('markdown', 'docx', '-o', '-')

exports.pandoc = pandoc
exports.docxToMarkdown = docxToMarkdown
exports.markdownToDocx = markdownToDocx
