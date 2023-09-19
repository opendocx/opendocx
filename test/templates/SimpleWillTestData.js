/* eslint-disable no-unused-vars, comma-dangle */

const SimpleWillDemoContext = {
  Testator: {
    Name: 'John Smith',
    City: 'Jonestown',
    State: 'Pennsylvania',
    County: 'Lebanon',
    Gender: { Name: 'Male', HeShe: 'he', HimHer: 'him', HisHer: 'his', HisHers: 'his' }
  },
  GoverningLaw: 'Pennsylvania',
  SigningDate: new Date(2019, 2, 10),
  Witness1Name: 'John Doe',
  Witness2Name: 'Marilyn Monroe',
  WitnessNames: ['Jürgen Kemper', 'Marlene Dietrich', 'Hedy Lamar'],
  NotaryCounty: 'Allegheny',
  NominateBackup: true,
  Representative: {
    Name: 'Kim Johnston',
    City: 'Philadelphia',
    State: 'Pennsylvania',
    County: 'Philadelphia',
    Gender: { Name: 'Female', HeShe: 'she', HimHer: 'her', HisHer: 'her', HisHers: 'hers' }
  },
  BackupRepresentative: {
    Name: 'Tina Turner',
    City: 'Los Angeles',
    State: 'California',
    County: 'Los Angeles',
    Gender: { Name: 'Female', HeShe: 'she', HimHer: 'her', HisHer: 'her', HisHers: 'hers' }
  },
  Beneficiaries: [
    {
      Name: 'Kelly Smith',
      Address: '1234 Anystreet, Allentown, PA',
      Relationship: 'Daughter',
      SSNLast4: '5555',
      PropertyBequeath: 'My cat.'
    },
    {
      Name: 'John Smith Jr.',
      Address: '54321 Geronimo, Jonestown, PA',
      Relationship: 'Son',
      SSNLast4: '4444',
      PropertyBequeath: 'My house.'
    },
    {
      Name: 'Diane Kennedy',
      Address: 'Unknown',
      Relationship: 'Mistress',
      PropertyBequeath: 'My misguided affection.'
    },
    {
      Name: 'Tim Billingsly',
      Address: 'Boulder, CO',
      Relationship: 'cat',
      PropertyBequeath: 'Everything else.'
    },
  ],
}

module.exports = SimpleWillDemoContext
