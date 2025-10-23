// src/lib/parseSignalment.ts
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

// Regexes
const phoneRe = /\+?\d{1,2}?\s*\(?\d{3}\)?[ .-]?\d{3}[ .-]?\d{4}\b/;
const weightRe = /\b(\d+(?:\.\d+)?)\s*(kg|kgs|kilograms?|lb|lbs|pounds?)\b/i;
const dobRe = /\b(?:dob|d\.?o\.?b\.?|date of birth)\s*[:\-]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\b/i;
const yoRe = /\b(\d+)\s*(?:yo|y\/o)\b/i;

const pidRe = /\bpatient\s*id\s*[:\-]?\s*([A-Za-z0-9\-_.]+)\b/i;
const cidRe = /\bclient\s*id\s*[:\-]?\s*([A-Za-z0-9\-_.]+)\b/i;

const ownerRe = /\b(owner|guardian)\s*[:\-]?\s*([A-Za-z ,.'\-]+)\b/i;
const speciesKVRe = /\bspecies\s*[:\-]\s*([A-Za-z]+)\b/i;
const breedKVRe = /\bbreed\s*[:\-]\s*([A-Za-z][A-Za-z \-\/']{1,60})\b/i;
const colorKVRe = /\b(colou?r)\s*[:\-]\s*([A-Za-z][A-Za-z \-\/']{1,60})\b/i;
const sexKVRe = /\b(?:sex|gender)\s*[:\-]\s*(female|male|mn|mc|fs|fn|cm|mi|mni|spayed|neutered|intact|unknown)\b/i;

// New regexes for clinical data
const problemRe = /Presenting Problem:([\s\S]*?)(?=Past Pertinent History:|Current History:|Current Medications:|\n\n)/i;
const mriRe = /MRI\s+(\d{1,2}\/\d{1,2}\/\d{2,4}):\s*([^\n]+)/i;
const lastVisitRe = /Last visit\s+((?:\d{1,2}\/\d{1,2}\/\d{2,4}|\w+\s+\d{1,2}(?:st|nd|rd|th)?,\s+\d{4}))(?:\s*-\s*\d{1,2}\/\d{1,2}\/\d{2,4})?:\s*([^\n]+)/i;
const concernsRe = /Owner Concerns(?: & Clinical Signs)?:?\s*([^]+?)(?=Current Medications:|Plan:|Assessment:|\n\n)/i;

export function parseSignalment(text: string): ParseResult {
  const diag: string[] = [];
  const data: Signalment = {};
  const t = text.replace(/\r/g, "");
  const lower = t.toLowerCase();

  // 1) Direct K/V picks (highest confidence)
  // Patient name is usually the first line if it's just a name
  const firstLine = t.split('\n')[0].trim();
  const nameMatch = firstLine.match(/^([A-Za-z\s.'-]+)/);
  if (nameMatch && !firstLine.includes(':') && firstLine.split(' ').length < 5) {
      data.patientName = nameMatch[1].trim();
      diag.push(`patientName: ${data.patientName}`);
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

  const ownerMatch = t.match(ownerRe); if (ownerMatch) { data.ownerName = clean(ownerMatch[2]); diag.push(`owner:${data.ownerName}`); }
  const phone = t.match(phoneRe); if (phone) { data.ownerPhone = phone[0]; diag.push(`phone:${data.ownerPhone}`); }

  // 2) Heuristics if missing:

  // Sex from parentheses like "(FS)" anywhere
  if (!data.sex) {
    const sxPar = t.match(/\((fs|fn|mn|mc|cm|mi|mni)\)/i);
    if (sxPar) {
      data.sex = normalizeSex(sxPar[1]);
      diag.push(`sexParen:${sxPar[1]}→${data.sex}`);
    }
  }
  
  if (!data.patientName) {
      const nameAndSignalment = t.match(/^([A-Za-z\s]+)\s\((MN|FS)\)/);
      if (nameAndSignalment) {
          data.patientName = nameAndSignalment[1].trim();
          diag.push(`patientNameHeuristic: ${data.patientName}`);
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
  if (!data.breed) {
    const m = t.match(/\b(?:feline|canine)\s*-\s*([A-Za-z][A-Za-z \-\/']{2,40})/i);
    if (m) {
      const cand = titleCase(clean(m[1]));
      if (!breedStopwords.has(cand.toLowerCase())) {
        data.breed = cand;
        diag.push(`breedHeur:${cand}`);
      }
    }
  }

  // Clinical data extraction
  const problemMatch = t.match(problemRe);
  if (problemMatch && problemMatch[1]) {
      // Clean up the problem text
      let problemText = problemMatch[1].replace(/^[*\s\n]+/, ''); // remove leading list markers
      problemText = problemText.split('\n').map(l => l.trim()).join(' ').trim();
      data.problem = problemText
      diag.push(`problem: found`);
  }

  const mriMatch = t.match(mriRe);
  if (mriMatch) {
      data.mriDate = mriMatch[1].trim();
      data.mriFindings = mriMatch[2].trim();
      diag.push(`mri: found`);
  }

  const lastVisitMatch = t.match(lastVisitRe);
  if (lastVisitMatch) {
      data.lastRecheck = lastVisitMatch[1].trim();
      data.lastPlan = lastVisitMatch[2].trim();
      diag.push(`lastVisit: found`);
  }
  
  const concernsMatch = t.match(concernsRe);
  if (concernsMatch && concernsMatch[1]) {
      data.otherConcerns = concernsMatch[1].replace(/\n/g, ' ').trim();
      diag.push('otherConcerns: found');
  }


  // Final compacting
  if (data.age) data.age = compactAge(data.age);

  // Extract medications
  const medications = extractMedications(t);
  if (medications.length > 0) {
    data.medications = medications;
    diag.push(`medications:${medications.length} found`);
  }

  // Extract bloodwork
  const bloodwork = extractBloodwork(t);
  if (bloodwork) {
    data.bloodwork = bloodwork;
    diag.push(`bloodwork: extracted`);
  }

  return { data, diagnostics: diag };
}

/* ---------- Medication and Bloodwork extraction ---------- */

function extractMedications(text: string): string[] {
  const meds: Set<string> = new Set();
  
  // Look for "Current Medications:" section
  const medSectionMatch = text.match(/(?:Current Medications|Current Meds|Medications):\s*([^]+?)(?=\n\n|Past Pertinent History:|Current History:|Prior Diagnostics:|Plan:)/i);

  if (medSectionMatch && medSectionMatch[1]) {
      const section = medSectionMatch[1];
      const lines = section.split('\n').filter(line => line.trim() !== '');
      lines.forEach(line => meds.add(line.trim()));
  }

  return Array.from(meds);
}

function extractBloodwork(text: string): string | undefined {
  // Look for bloodwork section or individual lab values
  const bwSectionMatch = text.match(/(?:bloodwork|labs?|cbc|chemistry|blood\s+results?)\s*[:\-]?\s*([^\n]+(?:\n(?!\s*\n)[^\n]+)*)/i);

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
  // "5 years 3 months"
  let m = lower.match(/\b(\d+)\s*(?:years?|yrs?|y)\s*[,\s]*?(\d+)\s*(?:months?|mos?|mo|m)\b/);
  if (m) return `${m[1]} years ${m[2]} months`;

  // "5 years", "10 yr", "10 y"
  m = lower.match(/\b(\d+)\s*(?:years?|yrs?|y)\b/);
  if (m) return `${m[1]} years`;

  // "8 months", "8 mo", "8 m"
  m = lower.match(/\b(\d+)\s*(?:months?|mos?|mo|m)\b/);
  if (m) return `${m[1]} months`;

  // compact "5y3m"
  m = lower.match(/\b(\d+)\s*y\s*(\d+)\s*m\b/);
  if (m) return `${m[1]} years ${m[2]} months`;

  // "x months old", "x years old"
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
  return a.replace(/\s+years?/, " years").replace(/\s+months?/, " months").trim();
}
