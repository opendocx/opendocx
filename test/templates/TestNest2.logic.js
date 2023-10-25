/* eslint-disable no-unused-vars, comma-dangle, camelcase */

const TestNest2LogicTree = [
  {
    type: 'Content',
    expr: 'C',
    atom: 'C1',
    id: '1',
    idd: ['9'],
  },
  {
    type: 'If',
    expr: 'x',
    atom: 'C2',
    id: '2',
    contentArray: [
      {
        type: 'Content',
        expr: 'A',
        atom: 'C3',
        id: '3',
      },
      {
        type: 'List',
        expr: '[]',
        atom: 'L4',
        id: '4',
        contentArray: [
          {
            type: 'Content',
            expr: 'test',
            atom: 'C5',
            id: '5',
          },
        ]
      },
      {
        type: 'ElseIf',
        expr: 'y',
        atom: 'C7',
        id: '7',
        contentArray: [
          {
            type: 'Content',
            expr: 'A',
            atom: 'C3',
            id: '8',
          },
          {
            type: 'List',
            expr: 'outer',
            atom: 'L10',
            id: '10',
            contentArray: [
              {
                type: 'Content',
                expr: 'z?B:B2',
                atom: 'C11',
                id: '11',
              },
              {
                type: 'Content',
                expr: 'C',
                atom: 'C1',
                id: '12',
              },
              {
                type: 'List',
                expr: 'inner',
                atom: 'L13',
                id: '13',
                contentArray: [
                  {
                    type: 'Content',
                    expr: 'C',
                    atom: 'C1',
                    id: '14',
                  },
                ]
              },
              {
                type: 'Content',
                expr: 'D',
                atom: 'C16',
                id: '16',
              },
            ]
          },
          {
            type: 'Content',
            expr: 'E',
            atom: 'C18',
            id: '18',
          },
          {
            type: 'Else',
            id: '19',
            contentArray: [
              {
                type: 'Content',
                expr: 'E',
                atom: 'C18',
                id: '20',
              },
              {
                type: 'Content',
                expr: 'F',
                atom: 'C21',
                id: '21',
              },
              {
                type: 'List',
                expr: 'another',
                atom: 'L22',
                id: '22',
                contentArray: [
                  {
                    type: 'Content',
                    expr: 'G',
                    atom: 'C23',
                    id: '23',
                  },
                ]
              },
              {
                type: 'Content',
                expr: 'H',
                atom: 'C25',
                id: '25',
              },
            ]
          },
        ]
      },
    ]
  },
]

module.exports = TestNest2LogicTree
