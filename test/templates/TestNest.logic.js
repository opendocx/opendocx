/* eslint-disable no-unused-vars, comma-dangle, camelcase */

const TestNestLogicTree = [
  {
    type: 'If',
    expr: 'x',
    atom: 'C1',
    id: '1',
    contentArray: [
      {
        type: 'List',
        expr: '[]',
        atom: 'L2',
        id: '2',
        contentArray: [
          {
            type: 'Content',
            expr: 'test',
            atom: 'C3',
            id: '3',
          },
        ]
      },
      {
        type: 'ElseIf',
        expr: 'y',
        atom: 'C5',
        id: '5',
        contentArray: [
          {
            type: 'Content',
            expr: 'A',
            atom: 'C6',
            id: '6',
          },
          {
            type: 'List',
            expr: 'outer',
            atom: 'L7',
            id: '7',
            contentArray: [
              {
                type: 'Content',
                expr: 'z?B:B2',
                atom: 'C8',
                id: '8',
              },
              {
                type: 'List',
                expr: 'inner',
                atom: 'L9',
                id: '9',
                contentArray: [
                  {
                    type: 'Content',
                    expr: 'C',
                    atom: 'C10',
                    id: '10',
                  },
                ]
              },
              {
                type: 'Content',
                expr: 'D',
                atom: 'C12',
                id: '12',
              },
            ]
          },
          {
            type: 'Content',
            expr: 'E',
            atom: 'C14',
            id: '14',
          },
          {
            type: 'Else',
            id: '15',
            contentArray: [
              {
                type: 'Content',
                expr: 'F',
                atom: 'C16',
                id: '16',
              },
              {
                type: 'List',
                expr: 'another',
                atom: 'L17',
                id: '17',
                contentArray: [
                  {
                    type: 'Content',
                    expr: 'G',
                    atom: 'C18',
                    id: '18',
                  },
                ]
              },
              {
                type: 'Content',
                expr: 'H',
                atom: 'C20',
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
