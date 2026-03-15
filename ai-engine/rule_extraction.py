import os
import re
from functools import lru_cache
import pandas as pd

from preprocessing import preprocess_for_extraction

# Canonical skills and synonym aliases used by both resume and JD extraction.
SKILL_SYNONYMS = {
    "python": ["python", "python programming", "python developer", "py"],
    "machine learning": ["machine learning", "ml", "machine-learning"],
    "deep learning": ["deep learning", "dl", "deep-learning"],
    "natural language processing": ["natural language processing", "nlp", "text mining"],
    "data structures": ["data structures", "data-structures", "dsa"],
    "algorithms": ["algorithms", "algorithm design"],
    "sql": ["sql", "mysql", "postgresql", "postgres", "sql server"],
    "aws": ["aws", "amazon web services"],
    "javascript": ["javascript", "js"],
    "typescript": ["typescript", "ts"],
    "react": ["react", "reactjs", "react.js"],
    "node.js": ["node", "nodejs", "node.js"],
    "power bi": ["power bi", "powerbi"],
}

BASE_MULTIWORD_SKILLS = {
    "data science",
    "data analysis",
    "data engineering",
    "software engineering",
    "machine learning",
    "deep learning",
    "natural language processing",
    "computer vision",
    "data structures",
    "project management",
    "cloud computing",
    "object oriented programming",
}

EDUCATION_KEYWORDS = [
    "b.tech", "bachelor", "master", "m.tech", "phd", "b.e", "m.e", "b.sc", "m.sc", "mba"
]

CERT_KEYWORDS = [
    "certified", "certification", "aws certified", "azure certified", "google cloud", "pmp"
]

TECH_SINGLETONS = {
    "python", "java", "sql", "aws", "azure", "gcp", "docker", "kubernetes",
    "react", "node.js", "node", "javascript", "typescript", "pandas", "numpy",
    "spark", "hadoop", "tableau", "power bi", "git", "linux", "django", "flask"
}

STOP_SKILL_WORDS = {"and", "or", "in", "with", "data", "experience", "knowledge", "skill", "skills", "tool", "tools"}


@lru_cache(maxsize=1)
def load_skills_from_dataset():
    """Load potential skills from the project JD dataset (token + multi-word phrases)."""
    skills = set()
    try:
        base_dir = os.path.dirname(os.path.dirname(__file__))
        dataset_path = os.path.join(base_dir, "data", "job_descriptions_final_india.csv")
        if not os.path.exists(dataset_path):
            return skills

        df = pd.read_csv(dataset_path, encoding="latin1")
        text_column = next((c for c in df.columns if "description" in c.lower()), None)
        if not text_column:
            return skills

        for text in df[text_column].dropna().astype(str):
            lower_text = text.lower()
            # Include multi-word noun-like phrases (2-4 tokens)
            for phrase in re.findall(r"\b[a-z][a-z0-9+#.\-/]*(?:\s+[a-z][a-z0-9+#.\-/]*){1,3}\b", lower_text):
                phrase = re.sub(r"\s+", " ", phrase).strip(" -")
                if 3 <= len(phrase) <= 60:
                    skills.add(phrase)
            # Include single-word technical tokens
            for token in re.findall(r"\b[a-z][a-z0-9+#.\-]{1,25}\b", lower_text):
                skills.add(token)
    except Exception as e:
        print("Skill loading error:", e)

    return skills
def _build_alias_map():
    alias_map = {}
    for canonical, aliases in SKILL_SYNONYMS.items():
        for alias in aliases:
            alias_map[alias.lower()] = canonical
    return alias_map
ALIAS_TO_CANONICAL = _build_alias_map()
def normalize_skill(skill):
    if not skill:
        return ""
    s = skill.lower().strip()
    s = re.sub(r"[^a-z0-9+#.\-\s]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    if not s:
        return ""
    # Remove descriptive suffixes/prefixes around core skill labels.
    s = re.sub(r"\b(programming|developer|development|experience|framework|library|tools?)\b", "", s)
    s = re.sub(r"\s+", " ", s).strip()

    if s in ALIAS_TO_CANONICAL:
        return ALIAS_TO_CANONICAL[s]

    # Partial alias handling (e.g., "python programming language")
    for alias, canonical in ALIAS_TO_CANONICAL.items():
        if re.search(rf"\b{re.escape(alias)}\b", s):
            return canonical

    return s


def normalize_skills(skills):
    normalized = []
    seen = set()
    for skill in skills or []:
        n = normalize_skill(skill)
        if n and n not in STOP_SKILL_WORDS and n not in seen:
            seen.add(n)
            normalized.append(n)
    return normalized
def _extract_from_aliases(text):
    found = set()
    for alias, canonical in ALIAS_TO_CANONICAL.items():
        if re.search(rf"\b{re.escape(alias)}\b", text):
            found.add(canonical)
    return found


def _extract_from_skill_inventory(text):
    inventory = load_skills_from_dataset() | BASE_MULTIWORD_SKILLS | set(SKILL_SYNONYMS.keys())
    found = set()
    # Prioritize multi-word first
    for skill in sorted(inventory, key=lambda x: (-len(x.split()), -len(x))):
        if len(skill) < 2:
            continue
        if len(skill.split()) == 1 and skill not in TECH_SINGLETONS and skill not in SKILL_SYNONYMS:
            continue
        if re.search(rf"\b{re.escape(skill)}\b", text):
            normalized = normalize_skill(skill)
            if normalized and normalized not in STOP_SKILL_WORDS:
                found.add(normalized)
    return found


def extract_skills(text):
    cleaned = preprocess_for_extraction(text).lower()
    if not cleaned:
        return []

    skills = set()
    skills |= _extract_from_aliases(cleaned)
    skills |= _extract_from_skill_inventory(cleaned)

    # Extra noun-like phrases after skill markers (skills:, proficiency in, etc.)
    marker_pattern = re.compile(r"(?:skills?|technologies|tools|proficient in|experience with)\s*[:\-]\s*([^\n\r\.]+)", re.I)
    for segment in marker_pattern.findall(cleaned):
        for chunk in re.split(r",|/|\||;", segment):
            n = normalize_skill(chunk)
            if n and n not in STOP_SKILL_WORDS:
                skills.add(n)

    return normalize_skills(skills)


def extract_required_skills_from_jd(job_desc):
    if not job_desc:
        return []
    jd = preprocess_for_extraction(job_desc).lower()
    required = set()

    # Capture explicit requirement segments
    req_patterns = [
        r"required skills?[:\-]\s*([^\n\r\.]+)",
        r"must have[:\-]?\s*([^\n\r\.]+)",
        r"requirements?[:\-]\s*([^\n\r\.]+)",
        r"proficient in\s+([^\n\r\.]+)",
    ]
    for pattern in req_patterns:
        for segment in re.findall(pattern, jd, flags=re.I):
            for token in re.split(r",|/|\||;| and ", segment):
                n = normalize_skill(token)
                if n:
                    required.add(n)

    required |= set(extract_skills(jd))
    return normalize_skills(required)


def extract_years_of_experience(text):
    if not text:
        return 0
    content = preprocess_for_extraction(text).lower()
    matches = re.findall(r"(\d+)\+?\s*(?:years|yrs)(?:\s+of)?\s+experience", content)
    if matches:
        return max(int(m) for m in matches)
    return 0


def extract_education(text):
    cleaned = preprocess_for_extraction(text).lower()
    edu = [k for k in EDUCATION_KEYWORDS if re.search(rf"\b{re.escape(k)}\b", cleaned)]
    return normalize_skills(edu)


def extract_certifications(text):
    cleaned = preprocess_for_extraction(text).lower()
    certs = [k for k in CERT_KEYWORDS if re.search(rf"\b{re.escape(k)}\b", cleaned)]
    return normalize_skills(certs)


def extract_all(text):
    return {
        "skills": extract_skills(text),
        "years_of_experience": extract_years_of_experience(text),
        "education": extract_education(text),
        "certifications": extract_certifications(text),
    }


# Backward-compatible alias used in older modules.
extract_skills_from_resume = extract_skills