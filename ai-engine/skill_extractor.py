from keyword_extractor import extract_keywords
from rule_extraction import extract_skills_from_resume, normalize_skills


def extract_skills(text):

    # rule-based extraction
    rule_skills = extract_skills_from_resume(text)

    # semantic keyword extraction
    keywords = extract_keywords(text)
    return normalize_skills(list(rule_skills) + list(keywords))
