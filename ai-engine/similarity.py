"""
Hybrid matching: 50% SBERT + 30% TF-IDF + 20% rule-based.
Returns normalized percentage and full breakdown.
"""
import hashlib
import torch
from sentence_transformers import SentenceTransformer, util
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import re
import numpy as np
from config import MODEL_NAME, DEVICE
from preprocessing import preprocess_for_similarity
from rule_extraction import extract_all, extract_years_of_experience, extract_required_skills_from_jd

# Load SBERT
print(f"🚀 Loading SBERT ({MODEL_NAME}) on {DEVICE}...")
sbert_model = SentenceTransformer(MODEL_NAME, device=DEVICE)
tfidf_vectorizer = TfidfVectorizer(max_features=5000, ngram_range=(1, 2))

# In-memory embedding cache: key = hash(job_desc) or job_id
_embedding_cache = {}


def _cache_key(job_desc, job_id=None):
    if job_id:
        return f"job_{job_id}"
    return f"jd_{hashlib.md5((job_desc or '').encode()).hexdigest()}"


def get_job_embedding(job_desc, job_id=None):
    """Return cached or compute job description embedding."""
    key = _cache_key(job_desc, job_id)
    if key not in _embedding_cache:
        text = preprocess_for_similarity(job_desc or "")
        if not text:
            text = " "
        _embedding_cache[key] = sbert_model.encode([text], convert_to_tensor=True)[0]
    return _embedding_cache[key]


def detect_experience_level(text):
    text = (text or "").lower()
    if any(x in text for x in ["intern", "student", "fresher", "junior"]):
        return "Junior"
    return "Senior"


def compute_skill_gap(resume_skills, jd_skills):
    """resume_skills and jd_skills are lists. Returns (overlap_ratio, matched, missing)."""
    if not jd_skills:
        return 0.5, [], []
    resume_set = set(s.lower().strip() for s in resume_skills)
    jd_set = set(s.lower().strip() for s in jd_skills)
    matched = [s for s in jd_set if s in resume_set or any(s in r for r in resume_set) or any(r in s for r in resume_set)]
    missing = list(jd_set - set(matched))
    ratio = len(matched) / len(jd_set) if jd_set else 0
    return ratio, list(matched), missing


def rule_based_match_score(resume_extracted, jd_extracted):
    """
    Compute rule-based match score from extracted fields.
    Weights: skill overlap 0.5, years 0.3, education 0.1, certs 0.1.
    """
    skill_score, matched_skills, missing_skills = compute_skill_gap(
        resume_extracted.get("skills", []),
        jd_extracted.get("skills", [])
    )
    years_resume = resume_extracted.get("years_of_experience") or 0
    years_jd = jd_extracted.get("years_of_experience") or 0
    if years_jd <= 0:
        years_score = 1.0
    else:
        years_score = min(1.0, (years_resume / years_jd))

    education_score = 0.1 if (resume_extracted.get("education")) else 0.0
    cert_score = 0.1 if (resume_extracted.get("certifications")) else 0.0
    rule = 0.5 * skill_score + 0.3 * years_score + education_score + cert_score
    return rule, missing_skills, matched_skills


def calculate_similarity(resume_text, job_desc, job_title="", job_id=None):
    """
    Hybrid: 0.5 * SBERT + 0.3 * TF-IDF + 0.2 * rule-based.
    Returns (final_percentage, missing_keywords, experience_level, breakdown_dict, extracted_resume).
    """
    if not resume_text or not job_desc:
        return 0.0, [], "Junior", {}, {}

    resume_clean = preprocess_for_similarity(resume_text)
    jd_clean = preprocess_for_similarity(job_desc)
    if not resume_clean:
        resume_clean = " "
    if not jd_clean:
        jd_clean = " "

    # 1. SBERT (use cache for job)
    job_emb = get_job_embedding(job_desc, job_id)
    resume_emb = sbert_model.encode([resume_clean], convert_to_tensor=True)[0]
    semantic_score = float(util.cos_sim(resume_emb, job_emb.unsqueeze(0))[0][0])
    # Normalize from [-1,1] to [0,1]
    sbert_norm = (semantic_score + 1) / 2

    # 2. TF-IDF overlap
    try:
        tfidf_matrix = tfidf_vectorizer.fit_transform([resume_clean, jd_clean])
        tfidf_score = float(cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0])
    except Exception:
        tfidf_score = 0.0
    tfidf_norm = max(0, min(1, tfidf_score))

    # 3. Rule-based (use JD required-skills for accurate gap)
    resume_extracted = extract_all(resume_text)
    jd_extracted = extract_all(job_desc)
    jd_required = extract_required_skills_from_jd(job_desc)
    jd_extracted["skills"] = list(dict.fromkeys((jd_extracted.get("skills") or []) + jd_required))[:80]
    rule_score, missing_skills, matched_skills = rule_based_match_score(resume_extracted, jd_extracted)
    rule_norm = max(0, min(1, rule_score))

    # Hybrid formula
    final_raw = 0.5 * sbert_norm + 0.3 * tfidf_norm + 0.2 * rule_norm
    experience_level = detect_experience_level(resume_text)
    if experience_level == "Junior":
        senior_roles = ["senior", "lead", "manager", "director", "head"]
        if any(role in (job_title or "").lower() for role in senior_roles):
            final_raw -= 0.15
    final_percentage = round(max(0, min(100, final_raw * 100)), 2)

    breakdown = {
        "sbert_score": round(sbert_norm * 100, 2),
        "tfidf_score": round(tfidf_norm * 100, 2),
        "rule_score": round(rule_norm * 100, 2),
        "final_percentage": final_percentage,
    }
    # Missing keywords: use skill gap missing list (limit 15)
    missing_keywords = list(missing_skills)[:15]
    if not missing_keywords and jd_clean:
        # Fallback: important JD terms not in resume (simple word difference)
        jd_tokens = set(re.findall(r"\b\w+\b", jd_clean))
        res_tokens = set(re.findall(r"\b\w+\b", resume_clean))
        missing_keywords = list(jd_tokens - res_tokens)[:15]

    return final_percentage, missing_keywords, experience_level, breakdown, resume_extracted


def extract_missing_keywords(resume_text, jd_text):
    """Return list of missing keywords (for backward compatibility)."""
    _, missing, _, _, _ = calculate_similarity(resume_text, jd_text)
    return missing[:10]


def infer_top_roles(score):
    if score >= 80:
        return ["Top Match", "Highly Qualified"]
    if score >= 50:
        return ["Potential Match", "Skills Alignment"]
    return ["Low Match", "Learning Path"]
