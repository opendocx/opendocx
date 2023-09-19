/* eslint-disable no-unused-vars, comma-dangle, camelcase */

const TestNestLogicTree = [
  {
    type: 'If',
    expr: 'x',
    atom: 'o',
    id: '1',
    contentArray: [
      {
        type: 'List',
        expr: '[]',
        atom: 'b',
        id: '2',
        contentArray: [
          {
            type: 'Content',
            expr: 'test',
            atom: 'a',
            id: '3',
          },
        ]
      },
      {
        type: 'ElseIf',
        expr: 'y',
        atom: 'n',
        id: '5',
        contentArray: [
          {
            type: 'Content',
            expr: 'A',
            atom: 'c',
            id: '6',
          },
          {
            type: 'List',
            expr: 'outer',
            atom: 'h',
            id: '7',
            contentArray: [
              {
                type: 'Content',
                expr: 'z?B:B2',
                atom: 'd',
                id: '8',
              },
              {
                type: 'List',
                expr: 'inner',
                atom: 'f',
                id: '9',
                contentArray: [
                  {
                    type: 'Content',
                    expr: 'C',
                    atom: 'e',
                    id: '10',
                  },
                ]
              },
              {
                type: 'Content',
                expr: 'D',
                atom: 'g',
                id: '12',
              },
            ]
          },
          {
            type: 'Content',
            expr: 'E',
            atom: 'i',
            id: '14',
          },
          {
            type: 'Else',
            id: '15',
            contentArray: [
              {
                type: 'Content',
                expr: 'F',
                atom: 'j',
                id: '16',
              },
              {
                type: 'List',
                expr: 'another',
                atom: 'l',
                id: '17',
                contentArray: [
                  {
                    type: 'Content',
                    expr: 'G',
                    atom: 'k',
                    id: '18',
                  },
                ]
              },
              {
                type: 'Content',
                expr: 'H',
                atom: 'm',
                id: '20',
              },
            ]
          },
        ]
      },
    ]
  },
]

module.exports = TestNestLogicTree
