'use client';

export interface Medication {
  name: string;
  instructions: string;
  nextDose?: string;
}

export interface DischargeMedGroup {
  range: string;
  recheckNote?: string;
  meds: Medication[];
}

const dischargeMeds: DischargeMedGroup[] = [
  {
    range: '<7kg',
    recheckNote: 'Please schedule a recheck exam in 10-14 days with the RBVH Neurology service.',
    meds: [
      {
        name: 'Prednisone 5mg tablets',
        instructions: 'Give 1/2 tablet by mouth every 12 hours for 7 days, then give 1/2 tablet by mouth every 24 hours for 7 days, then give 1/2 tablet by mouth every 48 hours for 7 doses. Today is the first day of this schedule.',
        nextDose: '**Next dose due at 8pm tonight**',
      },
      {
        name: 'Famotidine 10mg tablets',
        instructions: 'Give 1/2 tablet by mouth every 24 hours while on prednisone.',
        nextDose: '**Next dose due at 8am tomorrow morning**',
      },
      {
        name: 'Gabapentin 50mg tablets',
        instructions: 'Give 1 tablet by mouth every 8-12 hours for pain until otherwise advised. May cause sedation.',
        nextDose: '**Next dose due at 4pm tonight**',
      },
      {
        name: 'Tramadol 50mg tablets',
        instructions: 'Give 1/4 tablet by mouth every 8-12 hours for pain until otherwise advised. May cause sedation.',
        nextDose: '**Next dose due at 4pm tonight**',
      },
      {
        name: 'Hemp 3.8mg capsules (Mobility)',
        instructions: 'Give 2 capsules by mouth every 12 hours for 7 days, then give 1 capsule by mouth every 12 hours until otherwise advised.',
        nextDose: '**Next dose due at 8pm tonight**',
      },
      {
        name: 'Hemp 3.8mg capsules (Brain)',
        instructions: 'Give 3 capsules by mouth every 12 hours until otherwise advised.',
        nextDose: '**Next dose due at 8pm tonight**',
      },
      {
        name: 'Hemp complete oil',
        instructions: 'Give 0.1mL by mouth every 12 hours until otherwise advised.',
        nextDose: '**Next dose due at 8pm tonight**',
      },
      {
        name: 'Clavamox 62.5mg tablets (Option 1)',
        instructions: 'Give 1 tablet by mouth every 12 hours until finished. Give with food.',
        nextDose: '**Next dose due at 8pm tonight**',
      },
      {
        name: 'Clavamox 62.5mg tablets (Option 2)',
        instructions: 'Give 1.5 tablets by mouth every 12 hours until finished. Give with food.',
        nextDose: '**Next dose due at 8pm tonight**',
      },
      {
        name: 'Fentanyl patch',
        instructions: 'Please remove this on ********* as per the instructions below.',
      },
    ],
  },
  {
    range: '7-9kg',
    meds: [
      {
        name: 'Prednisone 5mg tablets',
        instructions: 'Give 1 tablet by mouth every 12 hours for 7 days, then give 1 tablet by mouth every 24 hours for 7 days, then give 1 tablet by mouth every 48 hours for 7 doses. Today is the first day of this schedule.',
        nextDose: '**Next dose due at 8pm tonight**',
      },
      {
        name: 'Famotidine 10mg tablets',
        instructions: 'Give 1/2 tablet by mouth every 24 hours while on prednisone.',
        nextDose: '**Next dose due at 8am tomorrow morning**',
      },
      {
        name: 'Gabapentin 50mg tablets',
        instructions: 'Give 1 tablet by mouth every 8-12 hours for pain until otherwise advised. May cause sedation.',
        nextDose: '**Next dose due at 4pm tonight**',
      },
      {
        name: 'Gabapentin 100mg capsules',
        instructions: 'Give 1 capsule by mouth every 8-12 hours for pain until otherwise advised. May cause sedation.',
        nextDose: '**Next dose due at 4pm tonight**',
      },
      {
        name: 'Tramadol 50mg tablets',
        instructions: 'Give 1/4 tablet by mouth every 8-12 hours for pain until otherwise advised. May cause sedation.',
        nextDose: '**Next dose due at 4pm tonight**',
      },
      {
        name: 'Hemp 3.8mg capsules (Mobility)',
        instructions: 'Give 3 capsules by mouth every 12 hours for 7 days, then give 2 capsules by mouth every 12 hours until otherwise advised.',
        nextDose: '**Next dose due at 8pm tonight**',
      },
      {
        name: 'Hemp 3.8mg capsules (Brain)',
        instructions: 'Give 4 capsules by mouth every 12 hours until otherwise advised.',
        nextDose: '**Next dose due at 8pm tonight**',
      },
      {
        name: 'Hemp complete oil',
        instructions: 'Give 0.1mL by mouth every 12 hours until otherwise advised.',
        nextDose: '**Next dose due at 8pm tonight**',
      },
      {
        name: 'Clavamox 250mg Tablets',
        instructions: 'Give 1/2 tablet every 12 hours until gone.',
        nextDose: '**Next dose due at 8pm tonight**',
      },
      {
        name: 'Clavamox 125mg Tablets',
        instructions: 'Give 1 tablet every 12 hours until gone.',
        nextDose: '**Next dose due at 8pm tonight**',
      },
      {
        name: 'Fentanyl patch',
        instructions: 'Please remove this on ********* as per the instructions below.',
      },
    ],
  },
  {
    range: '10-12kg',
    recheckNote: 'Please schedule a recheck appointment with the Neurology department to have staples removed in 10-14 days from now.',
    meds: [
      {
        name: 'Prednisone 5mg tablets',
        instructions: 'Give 1 tablet by mouth every 12 hours for 7 days, then give 1 tablet by mouth every 24 hours for 7 days, then give 1 tablet by mouth every 48 hours for 7 doses. Today is the first day of this schedule.',
        nextDose: '**Next dose due at 8pm tonight**',
      },
      {
        name: 'Famotidine 10mg tablets',
        instructions: 'Give 1 tablet by mouth every 24 hours while on prednisone.',
        nextDose: '**Next dose due at 8am tomorrow morning**',
      },
      {
        name: 'Gabapentin 100mg capsules',
        instructions: 'Give 1 capsule by mouth every 8-12 hours for pain until otherwise advised. May cause sedation.',
        nextDose: '**Next dose due at 4pm tonight**',
      },
      {
        name: 'Tramadol 50mg tablets',
        instructions: 'Give 1/2 tablet by mouth every 8-12 hours for pain until otherwise advised. May cause sedation.',
        nextDose: '**Next dose due at 4pm tonight**',
      },
      {
        name: 'Hemp 11.3mg capsules (Mobility)',
        instructions: 'Give 2 capsules by mouth every 12 hours for 7 days, then give 1 capsule by mouth every 12 hours until otherwise advised.',
        nextDose: '**Next dose due at 8pm tonight**',
      },
      {
        name: 'Hemp 11.3mg capsules (Brain)',
        instructions: 'Give 3 capsules by mouth every 12 until otherwise advised.',
        nextDose: '**Next dose due at 8pm tonight**',
      },
      {
        name: 'Hemp complete oil',
        instructions: 'Give 0.1mL by mouth every 12 hours until otherwise advised.',
        nextDose: '**Next dose due at 8pm tonight**',
      },
      {
        name: 'Cephalexin 250mg capsules',
        instructions: 'Give 1 capsule by mouth every 12 hours until finished. Give with food.',
        nextDose: '**Next dose due at 8pm tonight**',
      },
      {
        name: 'Fentanyl patch',
        instructions: 'Please remove this on ********* as per the instructions below.',
      },
    ],
  },
  {
    range: '13-15kg',
    meds: [
      {
        name: 'Prednisone 5mg tablets',
        instructions: 'Give 1.5 tablets by mouth every 12 hours for 7 days, then give 1.5 tablets by mouth every 24 hours for 7 days, then give 1.5 tablets by mouth every 48 hours for 7 doses. Today is the first day of this schedule.',
        nextDose: '**Next dose due at 8pm tonight**',
      },
      {
        name: 'Famotidine 10mg tablets',
        instructions: 'Give 1 tablet by mouth every 24 hours while on prednisone.',
        nextDose: '**Next dose due at 8am tomorrow morning**',
      },
      {
        name: 'Gabapentin 100mg capsules',
        instructions: 'Give 1 capsule by mouth every 8-12 hours for pain until otherwise advised. May cause sedation.',
        nextDose: '**Next dose due at 4pm tonight**',
      },
      {
        name: 'Tramadol 50mg tablets',
        instructions: 'Give 1/2 tablet by mouth every 8-12 hours for pain until otherwise advised. May cause sedation.',
        nextDose: '**Next dose due at 4pm tonight**',
      },
      {
        name: 'Hemp 11.3mg capsules (Mobility)',
        instructions: 'Give 2 capsules by mouth every 12 hours for 7 days, then give 1 capsule by mouth every 12 hours until otherwise advised.',
        nextDose: '**Next dose due at 8pm tonight**',
      },
      {
        name: 'Hemp 11.3mg capsules (Brain)',
        instructions: 'Give 3 capsules by mouth every 12 hours until otherwise advised.',
        nextDose: '**Next dose due at 8pm tonight**',
      },
      {
        name: 'Hemp complete oil',
        instructions: 'Give 0.4mL by mouth every 12 hours for 7 days, then give 0.2mL by mouth every 12 hours until otherwise advised.',
        nextDose: '**Next dose due at 8pm tonight**',
      },
      {
        name: 'Cephalexin 250mg tablets',
        instructions: 'Give 1 tablet by mouth every 12 hours until finished. Give with food.',
        nextDose: '**Next dose due at 8pm tonight**',
      },
      {
        name: 'Fentanyl patch',
        instructions: 'Please remove this on ********* as per the instructions below.',
      },
    ],
  },
  {
    range: '16-20kg',
    meds: [
       {
        name: 'Prednisone 5mg tablets',
        instructions: 'Give 1.5 tablets by mouth every 12 hours for 7 days, then give 1.5 tablets by mouth every 24 hours for 7 days, then give 1.5 tablets by mouth every 48 hours for 7 doses. Today is the first day of this schedule.',
        nextDose: '**Next dose due at 8pm tonight**',
      },
      {
        name: 'Famotidine 10mg tablets',
        instructions: 'Give 1 tablet by mouth every 24 hours while on prednisone.',
        nextDose: '**Next dose due at 8am tomorrow morning**',
      },
      {
        name: 'Gabapentin 100mg capsules',
        instructions: 'Give 1 capsule by mouth every 8-12 hours for pain until otherwise advised. May cause sedation.',
        nextDose: '**Next dose due at 4pm tonight**',
      },
      {
        name: 'Tramadol 50mg tablets',
        instructions: 'Give 1/2 tablet by mouth every 8-12 hours for pain until otherwise advised. May cause sedation.',
        nextDose: '**Next dose due at 4pm tonight**',
      },
      {
        name: 'Hemp 11.3mg capsules (Mobility)',
        instructions: 'Give 3 capsules by mouth every 12 hours for 7 days, then give 2 capsules by mouth every 12 hours until otherwise advised.',
        nextDose: '**Next dose due at 8pm tonight**',
      },
      {
        name: 'Hemp 11.3mg capsules (Brain)',
        instructions: 'Give 4 capsules by mouth every 12 hours until otherwise advised.',
        nextDose: '**Next dose due at 8pm tonight**',
      },
      {
        name: 'Hemp complete oil',
        instructions: 'Give 0.4mL by mouth every 12 hours for 7 days, then give 0.2mL by mouth every 12 hours until otherwise advised.',
        nextDose: '**Next dose due at 8pm tonight**',
      },
      {
        name: 'Cephalexin 250mg capsule',
        instructions: 'Give 1 capsule by mouth every 12 hours until finished. Give with food.',
        nextDose: '**Next dose due at 8pm tonight**',
      },
       {
        name: 'Fentanyl patch',
        instructions: 'Please remove this on ********* as per the instructions below.',
      },
    ],
  },
  {
    range: '21-26kg',
     meds: [
      {
        name: 'Prednisone 5mg tablets',
        instructions: 'Give 2 tablets by mouth every 12 hours for 7 days, then give 2 tablets by mouth every 24 hours for 7 days, then give 2 tablets by mouth every 48 hours for 7 doses. Today is the first day of this schedule.',
        nextDose: '**Next dose due at 8pm tonight**',
      },
      {
        name: 'Famotidine 10mg tablets',
        instructions: 'Give 1 tablet by mouth every 24 hours while on prednisone.',
        nextDose: '**Next dose due at 8am tomorrow morning**',
      },
      {
        name: 'Gabapentin 100mg capsules',
        instructions: 'Give 1-2 capsules by mouth every 8-12 hours for pain until otherwise advised. May cause sedation.',
        nextDose: '**Next dose due at 4pm tonight**',
      },
      {
        name: 'Tramadol 50mg tablets',
        instructions: 'Give 1 tablet by mouth every 8-12 hours for pain until otherwise advised. May cause sedation.',
        nextDose: '**Next dose due at 4pm tonight**',
      },
      {
        name: 'Hemp 11.3mg capsules (Mobility)',
        instructions: 'Give 3 capsules by mouth every 12 hours for 7 days, then give 2 capsules by mouth every 12 hours until otherwise advised.',
        nextDose: '**Next dose due at 8pm tonight**',
      },
      {
        name: 'Hemp 11.3mg capsules (Brain)',
        instructions: 'Give 4 capsules by mouth every 12 hours until otherwise advised.',
        nextDose: '**Next dose due at 8pm tonight**',
      },
      {
        name: 'Cephalexin 500mg capsule',
        instructions: 'Give 1 capsule by mouth every 12 hours until finished. Give with food.',
        nextDose: '**Next dose due at 8pm tonight**',
      },
       {
        name: 'Clavamox 375mg tablet',
        instructions: 'Give 1 tablet by mouth every 12 hours until finished. Give with food.',
        nextDose: '**Next dose due at 8pm tonight**',
      },
       {
        name: 'Fentanyl patch',
        instructions: 'Please remove this on ********* as per the instructions below.',
      },
    ],
  },
  {
    range: '27-30kg',
    meds: [
       {
        name: 'Prednisone 5mg tablets',
        instructions: 'Give 2 tablets by mouth every 12 hours for 7 days, then give 2 tablets by mouth every 24 hours for 7 days, then give 2 tablets by mouth every 48 hours for 7 doses. Today is the first day of this schedule.',
        nextDose: '**Next dose due at 8pm tonight**',
      },
      {
        name: 'Famotidine 20mg tablets',
        instructions: 'Give 1 tablet by mouth every 24 hours while on prednisone.',
        nextDose: '**Next dose due at 8am tomorrow morning**',
      },
      {
        name: 'Gabapentin 100mg capsules',
        instructions: 'Give 1-2 capsules by mouth every 8-12 hours for pain until otherwise advised. May cause sedation.',
        nextDose: '**Next dose due at 4pm tonight**',
      },
      {
        name: 'Tramadol 50mg tablets',
        instructions: 'Give 1 tablet by mouth every 8-12 hours for pain until otherwise advised. May cause sedation.',
        nextDose: '**Next dose due at 4pm tonight**',
      },
      {
        name: 'Hemp 28mg capsules (Mobility)',
        instructions: 'Give 2 capsules by mouth every 12 hours for 7 days, then give 1 capsules by mouth every 12 hours until otherwise advised.',
        nextDose: '**Next dose due at 8pm tonight**',
      },
      {
        name: 'Hemp 28mg capsules (Brain)',
        instructions: 'Give 3 capsules by mouth every 12 hours until otherwise advised.',
        nextDose: '**Next dose due at 8pm tonight**',
      },
       {
        name: 'Clavamox 375mg tablet',
        instructions: 'Give 1 tablet by mouth every 12 hours until finished. Give with food.',
        nextDose: '**Next dose due at 8pm tonight**',
      },
      {
        name: 'Fentanyl patch',
        instructions: 'Please remove this on ********* as per the instructions below.',
      },
    ],
  },
   {
    range: '>30kg',
    meds: [
       {
        name: 'Prednisone 5mg tablets',
        instructions: 'Give 2.5 tablets by mouth every 12 hours for 7 days, then give 2.5 tablets by mouth every 24 hours for 7 days, then give 2.5 tablets by mouth every 48 hours for 7 doses. Today is the first day of this schedule.',
        nextDose: '**Next dose due at 8pm tonight**',
      },
      {
        name: 'Famotidine 20mg tablets',
        instructions: 'Give 1 tablet by mouth every 24 hours while on prednisone.',
        nextDose: '**Next dose due at 8am tomorrow morning**',
      },
      {
        name: 'Gabapentin 100mg capsules',
        instructions: 'Give 1-2 capsules by mouth every 8-12 hours for pain until otherwise advised. May cause sedation.',
        nextDose: '**Next dose due at 4pm tonight**',
      },
      {
        name: 'Tramadol 50mg tablets',
        instructions: 'Give 1.5-2 tablets by mouth every 8-12 hours for pain until otherwise advised. May cause sedation.',
        nextDose: '**Next dose due at 4pm tonight**',
      },
      {
        name: 'Hemp 28mg capsules (Mobility)',
        instructions: 'Give 2 capsules by mouth every 12 hours for 7 days, then give 1 capsules by mouth every 12 hours until otherwise advised.',
        nextDose: '**Next dose due at 8pm tonight**',
      },
      {
        name: 'Hemp 28mg capsules (Brain)',
        instructions: 'Give 3 capsules by mouth every 12 hours until otherwise advised.',
        nextDose: '**Next dose due at 8pm tonight**',
      },
      {
        name: 'Cephalexin 500mg capsule',
        instructions: 'Give 2 capsules by mouth every 12 hours until finished. Give with food.',
        nextDose: '**Next dose due at 8pm tonight**',
      },
      {
        name: 'Fentanyl patch',
        instructions: 'Please remove this on ********* as per the instructions below.',
      },
    ],
  },
  {
    range: '40-54kg',
    meds: [
       {
        name: 'Hemp 37.5mg capsules (Mobility)',
        instructions: 'Give 2 capsules by mouth every 12 hours for 7 days, then give 1 capsules by mouth every 12 hours until otherwise advised.',
        nextDose: '**Next dose due at 8pm tonight**',
      },
      {
        name: 'Hemp 37.5mg capsules (Brain)',
        instructions: 'Give 3 capsules by mouth every 12 hours until otherwise advised.',
        nextDose: '**Next dose due at 8pm tonight**',
      },
    ],
  },
  {
    range: '>55kg',
    meds: [
       {
        name: 'Hemp 37.5mg capsules (Mobility)',
        instructions: 'Give 3 capsules by mouth every 12 hours for 7 days, then give 2 capsules by mouth every 12 hours until otherwise advised.',
        nextDose: '**Next dose due at 8pm tonight**',
      },
      {
        name: 'Hemp 37.5mg capsules (Brain)',
        instructions: 'Give 4 capsules by mouth every 12 hours until otherwise advised.',
        nextDose: '**Next dose due at 8pm tonight**',
      },
    ],
  },
];


export function getDischargeMedsByWeight(weight: number): DischargeMedGroup | undefined {
  if (weight < 7) return dischargeMeds.find(g => g.range === '<7kg');
  if (weight <= 9) return dischargeMeds.find(g => g.range === '7-9kg');
  if (weight <= 12) return dischargeMeds.find(g => g.range === '10-12kg');
  if (weight <= 15) return dischargeMeds.find(g => g.range === '13-15kg');
  if (weight <= 20) return dischargeMeds.find(g => g.range === '16-20kg');
  if (weight <= 26) return dischargeMeds.find(g => g.range === '21-26kg');
  if (weight <= 30) return dischargeMeds.find(g => g.range === '27-30kg');
  if (weight <= 39) return dischargeMeds.find(g => g.range === '>30kg'); // Note: This covers 31-39kg range
  if (weight <= 54) return dischargeMeds.find(g => g.range === '40-54kg');
  if (weight > 54) return dischargeMeds.find(g => g.range === '>55kg'); // handles >54kg
  
  return undefined; // No match
}

export function getAllDischargeMeds() {
  return dischargeMeds;
}
