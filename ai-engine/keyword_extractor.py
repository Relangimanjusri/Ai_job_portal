from keybert import KeyBERT
from sentence_transformers import SentenceTransformer

model = SentenceTransformer("all-MiniLM-L6-v2")
kw_model = KeyBERT(model)

def extract_keywords(text):

    keywords = kw_model.extract_keywords(
        text,
        keyphrase_ngram_range=(1,2),
        stop_words="english",
        top_n=20
    )

    return [k[0].lower() for k in keywords]