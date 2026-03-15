"""
Hybrid matching: 50% SBERT + 30% TF-IDF + 20% rule-based.
Returns normalized percentage and full breakdown.
"""
import hashlib
import re
from sentence_transformers import SentenceTransformer, util
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from config import MODEL_NAME, DEVICE
from preprocessing import preprocess_for_similarity
from rule_extraction import extract_all, extract_required_skills_from_jd, normalize_skills
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
    key = _cache_key(job_desc, job_id)
    if key not in _embedding_cache:
        text=preprocess_for_similarity(job_desc or "")or " "
        _embedding_cache[key] = sbert_model.encode([text], convert_to_tensor=True)[0]
    return _embedding_cache[key]


def detect_experience_level(text):
    text = (text or "").lower()
    if any(x in text for x in ["intern", "student", "fresher", "junior"]):
        return "Junior"
    return "Senior"
def compute_skill_overlap_score(resume_skills, jd_skills):
    """Return (normalized_overlap_score, matched, missing)."""
    resume_set = set(normalize_skills(resume_skills))
    jd_set = set(normalize_skills(jd_skills))

    if not jd_set:
        return 0.0, [], []
    matched = sorted(resume_set & jd_set)
    missing = sorted(jd_set - resume_set)
    score = len(matched) / len(jd_set)
    return score, matched, missing

def calculate_similarity(resume_text, job_desc, job_title="", job_id=None):
   
    if not resume_text or not job_desc:
        return 0.0, [], "Junior", {}, {}
    resume_clean = preprocess_for_similarity(resume_text) or " "
    jd_clean = preprocess_for_similarity(job_desc) or " "
    
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
    tfidf_norm = max(0.0, min(1.0, tfidf_score))

    # 3. Rule-based (use JD required-skills for accurate gap)
    resume_extracted = extract_all(resume_text)
    jd_extracted = extract_all(job_desc)
    jd_required = extract_required_skills_from_jd(job_desc)
    jd_skills = normalize_skills((jd_extracted.get("skills") or []) + jd_required)

    skill_overlap, matched_skills, missing_skills = compute_skill_overlap_score(resume_extracted.get("skills", []),jd_skills,)

    final_raw = 0.5 * sbert_norm + 0.3 * tfidf_norm + 0.2 * skill_overlap

    # Hybrid formula
    
    experience_level = detect_experience_level(resume_text)
    if experience_level == "Junior":
        senior_roles = ["senior", "lead", "manager", "director", "head"]
        if any(role in (job_title or "").lower() for role in senior_roles):
            final_raw -= 0.15
    final_percentage = round(max(0, min(100, final_raw * 100)), 2)

    breakdown = {
        "sbert_score": round(sbert_norm * 100, 2),
        "tfidf_score": round(tfidf_norm * 100, 2),
        "skill_overlap_score": round(skill_overlap * 100, 2),
        "rule_score": round(skill_overlap * 100, 2),  # backward compatibility
        "final_percentage": final_percentage,
    }
    # Missing keywords: use skill gap missing list (limit 15)
    missing_keywords = missing_skills[:15]
    if not missing_keywords and jd_clean:
        # Fallback: important JD terms not in resume (simple word difference)
        jd_tokens = set(re.findall(r"\b\w+\b", jd_clean))
        res_tokens = set(re.findall(r"\b\w+\b", resume_clean))
        missing_keywords = list(jd_tokens - res_tokens)[:15]
    resume_extracted["skills"] = normalize_skills(resume_extracted.get("skills", []))
    return final_percentage, missing_keywords, experience_level, breakdown, resume_extracted


def extract_missing_keywords(resume_text, jd_text):

    _, missing, _, _, _ = calculate_similarity(resume_text, jd_text)
    return missing[:10]


def infer_top_roles(score):
    if score >= 80:
        return ["Top Match", "Highly Qualified"]
    if score >= 50:
        return ["Potential Match", "Skills Alignment"]
    return ["Low Match", "Learning Path"]
