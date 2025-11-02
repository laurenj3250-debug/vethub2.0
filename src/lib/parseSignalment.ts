
export type Signalment = {
  species?: string;
  breed?: string;
  sex?: string;
  age?: string;
  dob?: string;
  weight?: string;
  color?: string;
  patientId?: string;
  clientId?: string;
  patientName?: string;
  ownerName?: string;
  ownerPhone?: string;
  problem?: string;
  lastRecheck?: string;
  lastPlan?: string;
  mriDate?: string;
  mriFindings?: string;
  medications?: string[];
  otherConcerns?: string;
  bloodwork?: string;
  signalment?: string;
};

export type ParseResult = {
  data: Signalment;
  diagnostics: string[]; // what matched / what didn't
};

const sexMap: Record<string, string> = {
  m: "Male", f: "Female",
  mn: "Male Neutered", mc: "Male Neutered",
  mi: "Male (intact)", cm: "Male (intact)", mni: "Male (intact)",
  fs: "Female Spayed", fn: "Female Spayed", sf: "Female Spayed",
  spayed: "Female Spayed", neutered: "Male Neutered",
  "male neutered": "Male Neutered",
  "female spayed": "Female Spayed",
  "male intact": "Male (intact)",
  "female intact": "Female (intact)",
  unknown: "Unknown",
};

const speciesSynonyms: Record<string, string> = {
  dog: "Canine", canine: "Canine", k9: "Canine",
  cat: "Feline", feline: "Feline",
  horse: "Equine", equine: "Equine",
  bovine: "Bovine", caprine: "Caprine", ovine: "Ovine",
  rabbit: "Lagomorph", lagomorph: "Lagomorph", ferret: "Mustelid",
};

const breedStopwords = new Set([
  "canine","feline","cat","dog","species","breed","sex","color","colour",
  "weight","wt","dob","age","owner","guardian","client","patient","id","ids",
  "mn","mc","fs","fn","cm","mi","mni","male","female","spayed","neutered",
]);

// ---------- Regexes ----------
const phoneRe = /\+?\d{1,2}?\s*\(?\d{3}\)?[ .-]?\d{3}[ .-]?\d{4}\b/;
const weightRe = /\b(\d+(?:\.\d+)?)\s*(kg|kgs|kilograms?|lb|lbs|pounds?)\b/i;
const dobRe = /\b(?:dob|d\.?o\.?b\.?|date of birth)\s*[:\-]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\b/i;
const yoRe = /\b(\d+)\s*(?:yo|y\/o)\b/i;

const pidRe = /\bpatient\s*id\s*[:\-]?\s*([A-Za-z0-9\-_.]+)\b/i;
const cidRe = /\bclient\s*id\s*[:\-]?\s*([A-Za-z0-9\-_.]+)\b/i;

const ownerRe = /\b(?:owner|guardian)\s*[:\-]?\s*([A-Za-z\s,.'\-]{2,40})\b/i;
const speciesKVRe = /\bspecies\s*[:\-]\s*([A-Za-z]+)\b/i;
const breedKVRe = /\bbreed\s*[:\-]\s*([A-Za-z][A-Za-z \-\/']{1,60})\b/i;
const colorKVRe = /\b(colou?r)\s*[:\-]\s*([A-Za-z][A-Za-z \-\/']{1,60})\b/i;
const sexKVRe = /\b(?:sex|gender)\s*[:\-]\s*(female|male|mn|mc|fs|fn|cm|mi|mni|spayed|neutered|intact|unknown)\b/i;

// Clinical data
const mriRe = /MRI\s+(\d{1,2}\/\d{1,2}\/\d{2,4}):\s*([^\n]+)/i;
const lastVisitRe = /Last visit\s+((?:\d{1,2}\/\d{1,2}\/\d{2,4}|\w+\s+\d{1,2}(?:st|nd|rd|th)?,\s+\d{4}))(?:\s*-\s*\d{1,2}\/\d{1,2}\/\d{2,4})?:\s*([^\n]+)/i;
const concernsRe = /Owner Concerns(?: & Clinical Signs)?:?\s*([^]+?)(?=Current Medications:|Plan:|Assessment:|\n\n)/i;

// Better Presenting Problem (handles RBVH "General Description" variant)
const problemBlockRe =
  /Presenting Problem[\s:]*([\s\S]*?)(?=\n{2,}|^\s*(General Description|NEUROLOGIC EXAM|ASSESSMENT|DIAGNOSTICS|TREATMENTS|PLAN|UPDATES)\b|^\d{2}-\d{2}-\d{4}\s)/im;

// Name (line like "Velvet (F)")
const nameParenSexRe = /^\s*([A-Za-z][A-Za-z\s.'-]{0,40})\s*\(\s*([A-Za-z]{1,3})\s*\)\s*$/m;

// Owner block + Primary phone
const ownerBlockRe = /Owner\s*\n+([^\n]+)\b/i;
const primaryPhoneRe = /Primary\s*Ph\s*:\s*([+()0-9 .-]{7,})/i;

// Additional age patterns with "days"
const yearsMonthsDaysRe = /\b(\d+)\s*(?:years?|yrs?|y)\s*(\d+)\s*(?:months?|mos?|mo|m)?\s*(\d+)\s*(?:days?|d)\b/i;
const yearsDaysRe = /\b(\d+)\s*(?:years?|yrs?|y)\s*(\d+)\s*(?:days?|d)\b/i;

// Med blocks
const vegMedsRe = /At\s+VEG\s+was\s+receiving\s*:\s*([\s\S]*?)(?=\n{2,}|^\s*[A-Z][A-Z ]{3,}:|^\s*(NEURO|GENERAL|PLAN|ASSESSMENT|DIAGNOSTICS|TREATMENTS|UPDATES)\b)/im;
const treatmentsRe = /^\s*TREATMENTS\s*:?\s*\n+([\s\S]*?)(?=\n{2,}|^\s*[A-Z][A-Z ]{3,}:|^\s*(PLAN|OUTCOME|UPDATES|ASSESSMENT|DIAGNOSTICS)\b)/im;

// Optional: name + signalment phrase in Presenting Problem
const problemNameSignalmentRe = /Presenting Problem:\s*([A-Za-z\s.'-]+?)\s+is an?\s+(.*?)(?:that is presenting|, presenting)/i;

export function parseSignalment(text: string): ParseResult {
  const diag: string[] = [];
  const data: Signalment = {};
  const t = text.replace(/\r/g, "");
  const lower = t.toLowerCase();

  // Try the presenting problem regex first
  const problemNameMatch = t.match(problemNameSignalmentRe);
  if (problemNameMatch) {
    data.patientName = problemNameMatch[1].trim();
    data.signalment = problemNameMatch[2].trim();
    diag.push(`problemNameSignalment: ${data.patientName} - ${data.signalment}`);
  }

  // Prefer a "Name (FS/MN/F/M...)" line anywhere
  const nameParen = t.match(nameParenSexRe);
  if (nameParen) {
    data.patientName = clean(nameParen[1]);
    const raw = nameParen[2].toLowerCase();
    data.sex = normalizeSex(raw);
    diag.push(`patientNameParen:${data.patientName}; sexParen:${raw}→${data.sex}`);
  }

  // 1) Direct K/V picks (highest confidence)
  // Patient name heuristic: first line without colon and short, excluding the word "Patient"
  const firstLine = t.split('\n')[0].trim();
  const nameMatch = firstLine.replace(/^patient:?\s*/i, '').match(/^([A-Za-z\s.'-]+\s+[A-Za-z\s.'-]+)/);
  if (nameMatch && !data.patientName && !firstLine.includes(':') && firstLine.split(' ').length < 5) {
    data.patientName = nameMatch[1].trim();
    diag.push(`patientName:${data.patientName}`);
  }

  const spKV = t.match(speciesKVRe);
  if (spKV) {
    data.species = normalizeSpecies(spKV[1]);
    diag.push(`speciesKV:${spKV[1]}`);
  }

  const brKV = t.match(breedKVRe);
  if (brKV) {
    const b = titleCase(clean(brKV[1]));
    if (!breedStopwords.has(b.toLowerCase())) {
      data.breed = b;
      diag.push(`breedKV:${b}`);
    }
  }

  const colKV = t.match(colorKVRe);
  if (colKV) {
    data.color = titleCase(clean(colKV[2]));
    diag.push(`colorKV:${data.color}`);
  }

  const sxKV = t.match(sexKVRe);
  if (sxKV) {
    data.sex = normalizeSex(sxKV[1]);
    diag.push(`sexKV:${sxKV[1]}→${data.sex}`);
  }

  const dobKV = t.match(dobRe);
  if (dobKV) {
    data.dob = dobKV[1];
    diag.push(`dobKV:${data.dob}`);
  }

  const wtKV = t.match(weightRe);
  if (wtKV) {
    data.weight = `${wtKV[1]} ${normalizeUnit(wtKV[2])}`;
    diag.push(`weight:${data.weight}`);
  }

  // Age (robust)
  const age = findAge(lower);
  if (age) {
    data.age = age;
    diag.push(`age:${age}`);
  } else {
    const yo = lower.match(yoRe);
    if (yo) {
      data.age = `${yo[1]} years`;
      diag.push(`ageYO:${data.age}`);
    }
  }

  // IDs / owner / phone
  const pid = t.match(pidRe); if (pid) { data.patientId = pid[1]; diag.push(`patientId:${pid[1]}`); }
  const cid = t.match(cidRe); if (cid) { data.clientId = cid[1]; diag.push(`clientId:${cid[1]}`); }

  // Owner name: prefer "Owner \n <name>"
  const ob = t.match(ownerBlockRe);
  if (ob) {
    data.ownerName = clean(ob[1]);
    diag.push(`ownerBlock:${data.ownerName}`);
  } else {
    const ownerMatch = t.match(ownerRe);
    if (ownerMatch) { data.ownerName = clean(ownerMatch[1]); diag.push(`owner:${data.ownerName}`); }
  }

  // Phone: prefer "Primary Ph:"
  const primaryPh = t.match(primaryPhoneRe);
  if (primaryPh) {
    data.ownerPhone = clean(primaryPh[1]);
    diag.push(`phonePrimary:${data.ownerPhone}`);
  } else {
    const phone = t.match(phoneRe);
    if (phone) { data.ownerPhone = phone[0]; diag.push(`phoneAny:${data.ownerPhone}`); }
  }

  // 2) Heuristics if missing:

  // Sex from parentheses like "(FS)" anywhere
  if (!data.sex) {
    const sxPar = t.match(/\((fs|fn|mn|mc|cm|mi|mni|f|m)\)/i);
    if (sxPar) {
      data.sex = normalizeSex(sxPar[1]);
      diag.push(`sexParen:${sxPar[1]}→${data.sex}`);
    }
  }

  if (!data.patientName) {
    const nameAndSignalment = t.match(/^([A-Za-z\s]+)\s\((MN|FS|F|M)\)/m);
    if (nameAndSignalment) {
      data.patientName = nameAndSignalment[1].trim();
      diag.push(`patientNameHeuristic:${data.patientName}`);
    }
  }

  // Species inference from tokens
  if (!data.species) {
    for (const key of Object.keys(speciesSynonyms)) {
      if (new RegExp(`\\b${key}\\b`, "i").test(t)) {
        data.species = speciesSynonyms[key];
        diag.push(`speciesWord:${key}→${data.species}`);
        break;
      }
    }
    if (!data.species) {
      if (/\b(dsh)\b/i.test(t)) { data.species = "Feline"; data.breed ??= "Domestic Shorthair"; diag.push("speciesDSH"); }
      else if (/\b(dmh)\b/i.test(t)) { data.species = "Feline"; data.breed ??= "Domestic Mediumhair"; diag.push("speciesDMH"); }
      else if (/\b(dlh)\b/i.test(t)) { data.species = "Feline"; data.breed ??= "Domestic Longhair"; diag.push("speciesDLH"); }
      else if (/\b(k9)\b/i.test(t)) { data.species = "Canine"; diag.push("speciesK9"); }
    }
  }

  // Breed from “Feline/Canine - Foo”
  if (!data.breed && !data.signalment) {
    const m = t.match(/\b(?:feline|canine)\s*-\s*([A-Za-z][A-Za-z \-\/']{2,40})/i);
    if (m) {
      const cand = titleCase(clean(m[1]));
      if (!breedStopwords.has(cand.toLowerCase())) {
        data.breed = cand;
        diag.push(`breedHeur:${cand}`);
      }
    }
  }

  // Presenting Problem block
  const problemBlock = t.match(problemBlockRe);
  if (problemBlock) {
    const lines = problemBlock[1]
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && !/^General Description$/i.test(l));
    if (lines.length) {
      data.problem = lines.join(' ').replace(/\s{2,}/g, ' ').trim();
      diag.push('problem:block found');
    }
  }

  // MRI
  const mriMatch = t.match(mriRe);
  if (mriMatch) {
    data.mriDate = mriMatch[1].trim();
    data.mriFindings = mriMatch[2].trim();
    diag.push(`mri:found`);
  }

  // Last visit / plan
  const lastVisitMatch = t.match(lastVisitRe);
  if (lastVisitMatch) {
    data.lastRecheck = lastVisitMatch[1].trim();
    data.lastPlan = lastVisitMatch[2].trim();
    diag.push(`lastVisit:found`);
  }

  // Owner concerns
  const concernsMatch = t.match(concernsRe);
  if (concernsMatch && concernsMatch[1]) {
    data.otherConcerns = concernsMatch[1].replace(/\n/g, ' ').trim();
    diag.push('otherConcerns:found');
  }

  // Final compacting
  if (data.age) data.age = compactAge(data.age);

  // Extract medications (Current Meds + At VEG… + TREATMENTS)
  const medications = extractMedications(t);
  if (medications.length > 0) {
    data.medications = medications;
    diag.push(`medications:${medications.length} found`);
  }

  // Extract bloodwork
  const bloodwork = extractBloodwork(t);
  if (bloodwork) {
    data.bloodwork = bloodwork;
    diag.push(`bloodwork:extracted`);
  }

  return { data, diagnostics: diag };
}

/* ---------- Medication and Bloodwork extraction ---------- */

function extractMedications(text: string): string[] {
  const meds: Set<string> = new Set();

  // Generic “Current Medications” style block
  const medSectionMatch = text.match(/(?:Current Medications|Current Meds|Medications):\s*([\s\S]*?)(?=\n{2,}|Past Pertinent History:|Current History:|Prior Diagnostics:|Plan:|ASSESSMENT|DIAGNOSTICS|TREATMENTS|UPDATES)/i);
  if (medSectionMatch && medSectionMatch[1]) {
    medSectionMatch[1]
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean)
      .forEach(line => meds.add(cleanMedLine(line)));
  }

  // “At VEG was receiving:” block
  const veg = text.match(vegMedsRe);
  if (veg && veg[1]) {
    veg[1]
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean)
      .forEach(line => meds.add(cleanMedLine(line)));
  }

  // “TREATMENTS:” block
  const tr = text.match(treatmentsRe);
  if (tr && tr[1]) {
    tr[1]
      .split('\n')
      .map(s => s.replace(/^[-–•]+/, '').trim())
      .filter(Boolean)
      .forEach(line => meds.add(cleanMedLine(line)));
  }

  return Array.from(meds).filter(Boolean);
}

function cleanMedLine(line: string): string {
  return line
    .replace(/\s{2,}/g, ' ')
    .replace(/\s*@\s*/g, ' @ ')
  .trim();
}

function extractBloodwork(text: string): string | undefined {
  // Look for bloodwork/diagnostics section or individual lab values
  const bwSectionMatch =
    text.match(/(?:bloodwork|labs?|cbc|chemistry|diagnostics|blood\s+results?)\s*[:\-]?\s*([^\n]+(?:\n(?!\s*\n)[^\n]+)*)/i);

  if (bwSectionMatch) {
    return bwSectionMatch[1].trim();
  }

  // Try to find individual lab values
  const labPattern = /\b(wbc|rbc|hgb|hct|plt|neutrophils?|lymphocytes?|monocytes?|eosinophils?|basophils?|alb|albumin|tp|total protein|glob|globulin|alt|alp|alkp|ast|ggt|tbil|total bilirubin|dbil|chol|cholesterol|trig|triglycerides?|bun|creat|creatinine|glucose|glu|ca|calcium|phos|phosphorus?|na|sodium|k|potassium|cl|chloride|bicarb|hco3|ag|anion gap|amylase|lipase|sdma|ckd|cpk|ck|mg|magnesium)\s*[:\-]?\s*(\d+(?:\.\d+)?)/gi;

  const labValues: string[] = [];
  const matches = text.matchAll(labPattern);
  for (const match of matches) {
    labValues.push(`${match[1]}: ${match[2]}`);
  }

  if (labValues.length > 0) {
    return labValues.join(', ');
  }

  return undefined;
}

/* ---------- helpers ---------- */

function normalizeSex(input?: string): string | undefined {
  if (!input) return undefined;
  const t = norm(input)
    .replace(/\bintact male\b/, "male intact")
    .replace(/\bintact female\b/, "female intact");
  if (sexMap[t]) return sexMap[t];
  const cleaned = t.replace(/[^a-z]/g, "");
  if (sexMap[cleaned]) return sexMap[cleaned];
  if (/female/.test(t) && /(spay|fs|fn)/.test(t)) return sexMap["fs"];
  if (/male/.test(t) && /(neuter|mn|mc)/.test(t)) return sexMap["mn"];
  if (/female/.test(t)) return "Female";
  if (/male/.test(t)) return "Male";
  if (/intact/.test(t) && /female/.test(t)) return "Female (intact)";
  if (/intact/.test(t) && /male/.test(t)) return "Male (intact)";
  return "Unknown";
}

function normalizeSpecies(input?: string): string | undefined {
  if (!input) return undefined;
  const t = norm(input);
  for (const [k, v] of Object.entries(speciesSynonyms)) {
    if (t.includes(k)) return v;
  }
  if (/domestic (short|medium|long)hair|dsh|dmh|dlh/i.test(t)) return "Feline";
  return capitalize(input);
}

function findAge(lower: string): string | undefined {
  let m;

  // "5 years 3 months 12 days"
  m = lower.match(yearsMonthsDaysRe);
  if (m) return `${m[1]} years ${m[2]} months ${m[3]} days`;

  // "5 years 12 days"
  m = lower.match(yearsDaysRe);
  if (m) return `${m[1]} years ${m[2]} days`;

  // "5 years 3 months"
  m = lower.match(/\b(\d+)\s*(?:years?|yrs?|y)\s*[,\s]*?(\d+)\s*(?:months?|mos?|mo|m)\b/);
  if (m) return `${m[1]} years ${m[2]} months`;

  // "5y3m"
  m = lower.match(/\b(\d+)\s*y\s*(\d+)\s*m\b/);
  if (m) return `${m[1]} years ${m[2]} months`;

  // "5 years", "10 yr", "10 y"
  m = lower.match(/\b(\d+)\s*(?:years?|yrs?|y)\b/);
  if (m) return `${m[1]} years`;

  // "8 months", "8 mo", "8 m"
  m = lower.match(/\b(\d+)\s*(?:months?|mos?|mo|m)\b/);
  if (m) return `${m[1]} months`;

  // "x years old", "x months old"
  m = lower.match(/\b(\d+)\s*(years?|yrs?|y)\s+old\b/);
  if (m) return `${m[1]} years`;
  m = lower.match(/\b(\d+)\s*(months?|mos?|mo|m)\s+old\b/);
  if (m) return `${m[1]} months`;

  return undefined;
}

function normalizeUnit(u: string) {
  const t = u.toLowerCase();
  if (t.startsWith("kg")) return "kg";
  if (t.startsWith("lb") || t.startsWith("pound")) return "lb";
  return u;
}

function clean(s: string) { return s.replace(/\s+/g, " ").trim(); }
function norm(s: string) { return s.toLowerCase().trim(); }
function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }
function titleCase(s: string) {
  return s.split(" ").map(w => w ? w[0].toUpperCase()+w.slice(1).toLowerCase() : w).join(" ");
}
function compactAge(a: string) {
  return a
    .replace(/\s+years?/, " years")
    .replace(/\s+months?/, " months")
    .replace(/\s+days?/, " days")
    .trim();
}
