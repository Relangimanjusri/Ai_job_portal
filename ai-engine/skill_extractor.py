from keyword_extractor import extract_keywords
from rule_extraction import extract_skills_from_resume


def extract_skills(text):

    # rule-based extraction
    rule_skills = extract_skills_from_resume(text)

    # semantic keyword extraction
    keywords = extract_keywords(text)

    skills = set(rule_skills)

    for k in keywords:
        skills.add(k)

    return list(skills)