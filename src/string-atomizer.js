'use strict'

class Atomizer {
  constructor () {
    this.atomSeed = 0
    this.atomStore = {}
  }

  get (str) {
    if (str === null) {
      throw new Error('Unexpected: cannot atomize a null string')
    }
    var result = this.atomStore[str]
    if (typeof result === 'string') return result
    // else
    result = base52(this.atomSeed++)
    this.atomStore[str] = result
    return result
  }
}

module.exports = Atomizer

const alpha = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
const alphaLen = alpha.length
function base52 (num) {
  let result = ''
  while (num > 0) {
    const index = num % alphaLen
    result = alpha.charAt(index) + result
    num = (num - index) / alphaLen
  }
  return result || 'a'
}
