/* eslint-disable no-unused-vars, comma-dangle, camelcase */

const TestNest2LogicTree = [
  {
    type: 'Content',
    expr: 'C',
    atom: 'a',
    id: '1',
    idd: ['9'],
  },
  {
    type: 'If',
    expr: 'x',
    atom: 'o',
    id: '2',
    contentArray: [
      {
        type: 'Content',
        expr: 'A',
        atom: 'b',
        id: '3',
      },
      {
        type: 'List',
        expr: '[]',
        atom: 'd',
        id: '4',
        contentArray: [
          {
            type: 'Content',
            expr: 'test',
            atom: 'c',
            id: '5',
          },
        ]
      },
      {
        type: 'ElseIf',
        expr: 'y',
        atom: 'n',
        id: '7',
        contentArray: [
          {
            type: 'Content',
            expr: 'A',
            atom: 'b',
            id: '8',
          },
          {
            type: 'List',
            expr: 'outer',
            atom: 'h',
            id: '10',
            contentArray: [
              {
                type: 'Content',
                expr: 'z?B:B2',
                atom: 'e',
                id: '11',
              },
              {
                type: 'Content',
                expr: 'C',
                atom: 'a',
                id: '12',
              },
              {
                type: 'List',
                expr: 'inner',
                atom: 'f',
                id: '13',
                contentArray: [
                  {
                    type: 'Content',
                    expr: 'C',
                    atom: 'a',
                    id: '14',
                  },
                ]
              },
              {
                type: 'Content',
                expr: 'D',
                atom: 'g',
                id: '16',
              },
            ]
          },
          {
            type: 'Content',
            expr: 'E',
            atom: 'i',
            id: '18',
          },
          {
            type: 'Else',
            id: '19',
            contentArray: [
              {
                type: 'Content',
                expr: 'E',
                atom: 'i',
                id: '20',
              },
              {
                type: 'Content',
                expr: 'F',
                atom: 'j',
                id: '21',
              },
              {
                type: 'List',
                expr: 'another',
                atom: 'l',
                id: '22',
                contentArray: [
                  {
                    type: 'Content',
                    expr: 'G',
                    atom: 'k',
                    id: '23',
                  },
                ]
              },
              {
                type: 'Content',
                expr: 'H',
                atom: 'm',
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
