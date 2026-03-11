const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

const AI_ENGINE_BASE = "http://127.0.0.1:8000";
const TIMEOUT = 60000;

/**
 * Analyze resume against job description. Returns match_percentage, match_breakdown, extracted, etc.
 */
exports.analyzeResumeWithAI = async (filePath, jobDescription, jobTitle, jobId = null) => {
  const form = new FormData();
  form.append("resume", fs.createReadStream(filePath));
  form.append("job_description", jobDescription || "No description provided");
  form.append("job_title", jobTitle || "General Role");
  if (jobId) form.append("job_id", jobId);

  try {
    const response = await axios.post(`${AI_ENGINE_BASE}/analyze`, form, {
      headers: { ...form.getHeaders() },
      timeout: TIMEOUT,
    });
    return response.data;
  } catch (error) {
    console.error("❌ AI Engine Service Error:", error.message);
    return {
      match_percentage: 0,
      missing_keywords: [],
      experience_level: "Unknown",
      match_breakdown: {},
      extracted: {},
      top_roles: [],
    };
  }
};

/**
 * Parse resume only; return extracted fields (skills, years, education, certifications).
 */
exports.parseResume = async (filePath) => {
  const form = new FormData();
  form.append("resume", fs.createReadStream(filePath));

  try {
    const response = await axios.post(`${AI_ENGINE_BASE}/parse`, form, {
      headers: { ...form.getHeaders() },
      timeout: TIMEOUT,
    });
    return response.data;
  } catch (error) {
    console.error("❌ AI Engine Parse Error:", error.message);
    return { extracted: { skills: [], years_of_experience: 0, education: [], certifications: [] } };
  }
};

/**
 * Skill gap report: resume vs job description. Returns matched/missing skills, suggestions, report_text.
 */
exports.skillGapReport = async (filePath, jobDescription, jobTitle) => {
  const form = new FormData();
  form.append("resume", fs.createReadStream(filePath));
  form.append("job_description", jobDescription || "");
  form.append("job_title", jobTitle || "");

  try {
    const response = await axios.post(`${AI_ENGINE_BASE}/skill-gap`, form, {
      headers: { ...form.getHeaders() },
      timeout: TIMEOUT,
    });
    return response.data;
  } catch (error) {
    console.error("❌ AI Engine Skill Gap Error:", error.message);
    return {
      matched_skills: [],
      missing_skills: [],
      missing_tools_frameworks: [],
      suggested_keywords: [],
      phrasing_suggestions: [],
      report_text: "Skill gap analysis failed.",
    };
  }
};

/**
 * Sort candidates by SBERT similarity (job vs profile text). Returns ordered list with scores.
 */
exports.shortlistBySimilarity = async (jobTitle, jobDescription, candidates) => {
  if (!candidates || !candidates.length) return { order: [] };
  try {
    const response = await axios.post(
      `${AI_ENGINE_BASE}/shortlist-by-similarity`,
      { job_title: jobTitle, job_description: jobDescription, candidates },
      { timeout: 60000 }
    );
    return response.data;
  } catch (error) {
    console.error("❌ AI Engine Shortlist By Similarity Error:", error.message);
    return { order: [] };
  }
};

/**
 * Random Forest shortlist: pass candidates with breakdown + extracted; returns array of 0/1.
 */
exports.shortlistRF = async (candidates) => {
  if (!candidates || !candidates.length) return { shortlist: [] };
  try {
    const response = await axios.post(
      `${AI_ENGINE_BASE}/shortlist-rf`,
      { candidates },
      { timeout: 30000 }
    );
    return response.data;
  } catch (error) {
    console.error("❌ AI Engine Shortlist RF Error:", error.message);
    return { shortlist: candidates.map(() => 0) };
  }
};
