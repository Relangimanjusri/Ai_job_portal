from PyPDF2 import PdfReader
from docx import Document

def extract_text_from_pdf(path):
    try:
        reader = PdfReader(path)
        text = ""
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + " "
        return text.strip()
    except Exception as e:
        print("[ERROR] PDF parse error:", e)
        return ""

def extract_text_from_docx(path):
    try:
        doc = Document(path)
        return " ".join(p.text for p in doc.paragraphs).strip()
    except Exception as e:
        print("[ERROR] DOCX parse error:", e)
        return ""

def extract_resume_text(path):
    if path.lower().endswith(".pdf"):
        return extract_text_from_pdf(path)
    if path.lower().endswith(".docx"):
        return extract_text_from_docx(path)
    return ""
