/* eslint-disable no-unused-vars, comma-dangle, camelcase */

const redundant_if_logic_tree = [
  {
    type: 'If',
    expr: 'x',
    atom: 'b',
    id: '1',
    contentArray: [{
      type: 'Content',
      expr: 'adjective',
      atom: 'a',
      id: '2',
    }, {
      type: 'Else',
      id: '3',
      contentArray: []
    }]
  }, {
    type: 'Content',
    expr: 'name',
    atom: 'c',
    id: '5',
  }, {
    type: 'If',
    expr: 'x',
    atom: 'b',
    id: '6',
    contentArray: [{
      type: 'Else',
      id: '7',
      contentArray: []
    }]
  }
]

module.exports = redundant_if_logic_tree

/*
inferred from redundant_if_logic_tree:
relevant:
  x: true
  adjective: x
  name: true
required:
  x: false
  adjective: x
  name: true
*/
