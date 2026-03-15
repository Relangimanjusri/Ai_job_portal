const TECH_SKILL_DICTIONARY = [
  "python",
  "java",
  "javascript",
  "machine learning",
  "deep learning",
  "nlp",
  "sql",
  "pandas",
  "numpy",
  "tensorflow",
  "pytorch",
  "react",
  "nodejs",
  "mongodb",
  "aws",
  "docker",
];

const GENERIC_EXCLUSIONS = new Set([
  "gmail",
  "names",
  "languages",
  "personal information",
  "email",
  "phone",
]);

const EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE_REGEX = /(?:\+?\d[\d\s-]{8,}\d)/;

function normalizeSkill(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function sanitizeTechnicalSkills(skills = []) {
  const allowed = new Set(TECH_SKILL_DICTIONARY);
  const seen = new Set();

  return skills
    .map(normalizeSkill)
    .filter(Boolean)
    .filter((skill) => !EMAIL_REGEX.test(skill) && !PHONE_REGEX.test(skill))
    .filter((skill) => !GENERIC_EXCLUSIONS.has(skill))
    .filter((skill) => allowed.has(skill))
    .filter((skill) => {
      if (seen.has(skill)) return false;
      seen.add(skill);
      return true;
    });
}

export { TECH_SKILL_DICTIONARY };
