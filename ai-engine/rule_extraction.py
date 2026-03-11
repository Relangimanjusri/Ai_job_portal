import pandas as pd
import os
import re

def load_skills_from_dataset():

    skills = set()

    try:

        base_dir = os.path.dirname(os.path.dirname(__file__))
        dataset_path = os.path.join(base_dir, "data", "job_descriptions_final_india.csv")

        df = pd.read_csv(dataset_path, encoding="latin1")

        # print available columns
        print("Dataset columns:", df.columns)

        # choose the correct column automatically
        text_column = None

        for col in df.columns:
            if "description" in col.lower():
                text_column = col
                break

        if text_column is None:
            print("No job description column found.")
            return skills

        for text in df[text_column].dropna():

            text = str(text).lower()

            tokens = re.findall(r"\b[a-z][a-z0-9\+\#\.\-]{1,20}\b", text)

            for token in tokens:
                if 2 <= len(token) <= 30:
                    skills.add(token)

        print("Loaded skills:", len(skills))

    except Exception as e:
        print("Skill loading error:", e)

    return skills