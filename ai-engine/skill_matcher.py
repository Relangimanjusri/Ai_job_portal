def normalize(skills):
    return set([s.lower().strip() for s in skills])

def compare_skills(resume_skills, jd_skills):

    resume_set = normalize(resume_skills)
    jd_set = normalize(jd_skills)

    matched_skills = list(resume_set.intersection(jd_set))
    missing_skills = list(jd_set - resume_set)

    return matched_skills, missing_skills

