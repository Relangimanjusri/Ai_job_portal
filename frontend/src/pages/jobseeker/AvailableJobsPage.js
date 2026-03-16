import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import { UploadCloud, FileText, X, Download, FileBadge, FileText as FileDoc, Pencil } from "lucide-react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import { sanitizeTechnicalSkills } from "../../utils/skillExtraction";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const statusClass = {
  accepted: "bg-emerald-100 text-emerald-700",
  "in review": "bg-amber-100 text-amber-700",
  rejected: "bg-red-100 text-red-700",
  applied: "bg-slate-200 text-slate-700",
};

export default function AvailableJobsPage({ embedded = false }) {
  const [jobs, setJobs] = useState([]);
  const [apps, setApps] = useState([]);
  const [loadingId, setLoadingId] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [fileError, setFileError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [lastResult, setLastResult] = useState(null);
  const [lastJobId, setLastJobId] = useState(null);
  const [skillGapOpen, setSkillGapOpen] = useState(false);
  const [skillGapLoading, setSkillGapLoading] = useState(false);
  const [skillGapData, setSkillGapData] = useState(null);
  const [skillGapJob, setSkillGapJob] = useState(null);
  const [filters, setFilters] = useState({ industry: "All", role: "All", location: "All", level: "All" });
  useEffect(() => {
    api
      .get("/api/jobs")
      .then((res) => setJobs(res.data))
      .catch((err) => console.error("Fetch failed", err));

    api
      .get("/api/applications/my-applications")
      .then((res) => setApps(res.data))
      .catch(() => setApps([]));
  }, []);
  const hasResumeData = Boolean(lastResult?.extracted && Object.keys(lastResult.extracted).length > 0);

  const handleFile = (file) => {
    if (!file) return;
    if (!/\.(pdf|docx)$/i.test(file.name)) {
      setFileError("Only PDF and DOCX files are allowed.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setFileError("File is too large. Please upload a file up to 5MB.");
      return;
    }

    setFileError("");
    if (previewUrl) URL.revokeObjectURL(previewUrl);

    setSelectedFile(file);
    setUploadProgress(0);
    if (file.type === "application/pdf") {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files[0];
    handleFile(droppedFile);
  };

  const handleApply = async (jobId, file) => {
    const f = file || selectedFile;
    if (!f) return;

    const formData = new FormData();
    formData.append("jobId", jobId);
    formData.append("resume", f);

    setLoadingId(jobId);
    setLastJobId(jobId);
    setLastResult(null);
    setUploadProgress(0);

    try {
      const res = await api.post("/api/applications/apply-ai", formData, {
        onUploadProgress: (progressEvent) => {
          if (!progressEvent.total) return;
          setUploadProgress(Math.round((progressEvent.loaded / progressEvent.total) * 100));
        },
      });
      const payload = res.data.aiAnalysis || res.data;
      const cleanedSkills = sanitizeTechnicalSkills(payload?.extracted?.skills || []);

      setLastResult({
        ...payload,
        extracted: {
          ...(payload.extracted || {}),
          skills: cleanedSkills,
        },
      });
      setUploadProgress(100);
    } catch (err) {
      alert(err.response?.data?.msg || "Application failed");
    } finally {
      setLoadingId(null);
    }
  };

  const getMatchColor = (pct) => {
    if (pct > 80) return "text-emerald-700 bg-emerald-100 border-emerald-200";
    if (pct >= 60) return "text-amber-700 bg-amber-100 border-amber-200";
    return "text-red-700 bg-red-100 border-red-200";
  };

  const openSkillGap = (job) => {
    setSkillGapJob(job);
    setSkillGapData(null);
    setSkillGapOpen(true);
  };

  const runSkillGap = async () => {
    if (!skillGapJob || !selectedFile) {
      alert("Upload a resume first, then select a job and run Skill Gap.");
      return;
    }

    setSkillGapLoading(true);
    const formData = new FormData();
    formData.append("resume", selectedFile);
    formData.append("jobId", skillGapJob._id);

    try {
      const res = await api.post("/api/applications/skill-gap", formData);
      setSkillGapData({
        ...res.data,
        matched_skills: sanitizeTechnicalSkills(res.data.matched_skills || []),
        missing_skills: sanitizeTechnicalSkills(res.data.missing_skills || []),
        suggested_keywords: sanitizeTechnicalSkills(res.data.suggested_keywords || []),
      });
    } catch (err) {
      alert(err.response?.data?.msg || "Skill gap analysis failed");
    } finally {
      setSkillGapLoading(false);
    }
  };

  const downloadReport = () => {
    window.print();
  };

  const extracted = lastResult?.extracted || {};
  const profileCards = [
    { title: "Personal Info", rows: [extracted.name, extracted.email, extracted.phone, extracted.location].filter(Boolean) },
    { title: "Skills", rows: sanitizeTechnicalSkills(extracted.skills || []) },
    { title: "Education", rows: extracted.education ? (Array.isArray(extracted.education) ? extracted.education : [extracted.education]) : [] },
    { title: "Experience", rows: extracted.experience ? (Array.isArray(extracted.experience) ? extracted.experience : [extracted.experience]) : [] },
    {
      title: "Certifications",
      rows: extracted.certifications ? (Array.isArray(extracted.certifications) ? extracted.certifications : [extracted.certifications]) : [],
    },
  ];
  const completedCount = profileCards.filter((c) => c.rows.length > 0).length;
  const completion = Math.round((completedCount / profileCards.length) * 100);

  const radarData = skillGapData
    ? (() => {
        const matched = (skillGapData.matched_skills || []).length;
        const missing = (skillGapData.missing_skills || []).length;
        const total = matched + missing || 1;
        const skillOverlap = Math.round((matched / total) * 100);
        const yrsRes = skillGapData.years_resume ?? 0;
        const yrsJd = skillGapData.years_jd ?? 1;
        const expFit = yrsJd > 0 ? Math.min(100, Math.round((yrsRes / yrsJd) * 100)) : 80;

        return [
          { subject: "Skills", score: skillOverlap, fullMark: 100 },
          { subject: "Experience", score: expFit, fullMark: 100 },
          { subject: "Keywords", score: Math.max(0, skillOverlap - 10), fullMark: 100 },
          { subject: "Readiness", score: Math.round((skillOverlap + expFit) / 2), fullMark: 100 },
        ];
      })()
    : [];

  const skillGapBars = skillGapData
    ? [
        { name: "Matched", value: (skillGapData.matched_skills || []).length, fill: "#16a34a" },
        { name: "Missing", value: (skillGapData.missing_skills || []).length, fill: "#dc2626" },
      ]
    : [];

  const filterOptions = useMemo(() => {
    const collect = (key, fallback) => ["All", ...new Set(jobs.map((j) => j[key] || fallback).filter(Boolean))];
    return {
      industry: collect("industry", "General"),
      role: collect("title", "Role"),
      location: collect("location", "Remote"),
      level: collect("experienceLevel", "Any"),
    };
  }, [jobs]);

  const filteredJobs = jobs.filter((job) => {
    const checks = [
      filters.industry === "All" || (job.industry || "General") === filters.industry,
      filters.role === "All" || (job.title || "Role") === filters.role,
      filters.location === "All" || (job.location || "Remote") === filters.location,
      filters.level === "All" || (job.experienceLevel || "Any") === filters.level,
    ];
    return checks.every(Boolean);
  });

  return (
    
    <div className="page-wrapper max-w-6xl mx-auto space-y-8">
      {!embedded && (
        <header className="page-header">
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-indigo-600 to-indigo-800 bg-clip-text text-transparent">Dashboard</h1>
          <p className="text-slate-600 mt-2 text-base">Resume-driven insights across profile, matching, analytics and tracking.</p>
        </header>
      )}

      <section id="resume-upload" className="p-6 rounded-2xl card-premium">
        <h2 className="text-xl font-bold text-slate-800 mb-4">1. Resume Upload</h2>

        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
            dragActive ? "border-indigo-500 bg-indigo-50" : "border-slate-300 bg-slate-50 hover:border-slate-400"
          }`}
        >
          <input type="file" accept=".pdf,.docx" className="hidden" id="resume-file-input" onChange={(e) => handleFile(e.target.files[0])} />
          <label htmlFor="resume-file-input" className="cursor-pointer block">
            <UploadCloud className="mx-auto text-slate-400 mb-2" size={32} />
            <p className="text-slate-600 text-sm">{selectedFile ? selectedFile.name : "Drag & drop your resume (PDF/DOCX) or click to browse"}</p>
          </label>
        </div>
        {fileError && <p className="text-red-600 text-sm mt-2">{fileError}</p>}
        {selectedFile && (
          <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-slate-700">
              {selectedFile.type.includes("pdf") ? <FileBadge size={16} /> : <FileDoc size={16} />}
              <span className="font-medium">{selectedFile.name}</span>
              <span className="text-slate-500 uppercase">{selectedFile.name.split(".").pop()}</span>
            </div>
            {previewUrl && (
              <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 text-sm hover:underline">
                Preview PDF
              </a>
            )}
          </div>
        )}
        {(loadingId || uploadProgress > 0) && (
          <div className="mt-3">
            <div className="h-2 w-full rounded bg-slate-200 overflow-hidden">
              <div className="h-full bg-indigo-600 transition-all" style={{ width: `${uploadProgress}%` }} />
            </div>
            <p className="text-xs text-slate-600 mt-1">Upload progress: {uploadProgress}%</p>
          </div>
        )}
      </section>
      <section id="profile-view" className="p-6 rounded-2xl card-premium">
        <h2 className="text-xl font-bold text-slate-800 mb-4">2. Profile View</h2>
        {!hasResumeData ? (
          <div className="p-5 rounded-xl border border-dashed border-slate-300 text-slate-600">Upload your resume to unlock this section</div>
        ) : (
          <>
            <div className="mb-5">
              <div className="flex justify-between text-sm mb-1"><span>Profile completion</span><span>{completion}%</span></div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${completion}%` }} /></div>
            </div>
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {profileCards.map((card) => (
                <article key={card.title} className="border border-slate-200 rounded-xl p-4 bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-slate-800">{card.title}</h3>
                    <button type="button" title="Edit by re-uploading your resume" className="text-slate-400 hover:text-slate-600">
                      <Pencil size={14} />
                    </button>
                  </div>
                  {card.title === "Skills" ? (
                    <div className="flex flex-wrap gap-2">
                      {card.rows.length ? card.rows.map((row, idx) => <span key={idx} className="px-2 py-1 rounded bg-indigo-50 text-indigo-700 text-xs">{String(row)}</span>) : <p className="text-sm text-slate-400">Not available</p>}
                    </div>
                  ) : (
                    <ul className="text-sm text-slate-600 space-y-1">
                      {card.rows.length ? card.rows.map((row, idx) => <li key={idx}>{String(row)}</li>) : <li className="text-slate-400">Not available</li>}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          </>
        )}
      </section>
      <section id="job-matching" className="p-6 rounded-2xl card-premium">
        <h2 className="text-xl font-bold text-slate-800 mb-4">3. Job Matching</h2>
        {!hasResumeData ? (
          <div className="p-5 rounded-xl border border-dashed border-slate-300 text-slate-600">Upload your resume to unlock this section</div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              {[
                ["industry", "Industry"],
                ["role", "Role"],
                ["location", "Location"],
                ["level", "Experience Level"],
              ].map(([key, label]) => (
                <select key={key} className="input-field" value={filters[key]} onChange={(e) => setFilters((f) => ({ ...f, [key]: e.target.value }))}>
                  {filterOptions[key].map((opt) => (
                    <option key={opt} value={opt}>{label}: {opt}</option>
                  ))}
                </select>
              ))}
            </div>
            <div className="grid gap-4">
              {filteredJobs.map((job) => {
                const score = job._id === lastJobId ? (lastResult?.match_percentage ?? 0) : 0;
                const resumeSkills = sanitizeTechnicalSkills(extracted.skills || []);
                const matchedSkills = resumeSkills.filter((s) => `${job.title} ${job.description}`.toLowerCase().includes(String(s).toLowerCase()));
                return (
                  <div key={job._id} className="job-card-premium p-6 rounded-2xl border border-slate-200">
                    <div className="flex flex-wrap justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-800">{job.title}</h3>
                        <p className="text-sm text-slate-600">{job.company || "Company"}</p>
                      </div>
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border font-semibold ${getMatchColor(score)}`}>{score}% Match</div>
                    </div>
                  
                    <div className="mt-3 flex flex-wrap gap-2">
                      {matchedSkills.length ? matchedSkills.slice(0, 8).map((s, i) => <span key={i} className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-xs">{s}</span>) : <span className="text-xs text-slate-500">No matched skill tags yet</span>}
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <input
                        type="file"
                        id={`f-${job._id}`}
                        accept=".pdf,.docx"
                        className="hidden"
                        onChange={(e) => {
                          handleFile(e.target.files[0]);
                          handleApply(job._id, e.target.files[0]);
                        }}
                      />
                      <label htmlFor={`f-${job._id}`} className="btn-primary inline-flex items-center gap-2 cursor-pointer">{loadingId === job._id ? "AI Analyzing..." : <><UploadCloud size={16} /> Apply with AI</>}</label>
                      <button type="button" onClick={() => openSkillGap(job)} className="btn-secondary inline-flex items-center gap-2">Skill Gap</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>
      <section id="feedback-analysis" className="p-6 rounded-2xl card-premium">
        <h2 className="text-xl font-bold text-slate-800 mb-4">4. Feedback & Analytics</h2>
        {!hasResumeData ? (
          <div className="p-5 rounded-xl border border-dashed border-slate-300 text-slate-600">Upload your resume to unlock this section</div>
        ) : (
          <>
            {!skillGapData ? (
              <div className="text-slate-600 text-sm">Open a job card and run Skill Gap to view analytics.</div>
            ) : (
              <div className="grid lg:grid-cols-2 gap-5">
                <div className="h-64 bg-white rounded-xl border border-slate-200 p-3">
                  <h3 className="font-semibold text-slate-700 text-sm mb-2">Skill Gap Bar Chart</h3>
                  <ResponsiveContainer width="100%" height="90%">
                    <BarChart data={skillGapBars}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <Legend />
                      <Bar dataKey="value" name="Skills" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="h-64 bg-white rounded-xl border border-slate-200 p-3">
                  <h3 className="font-semibold text-slate-700 text-sm mb-2">Competency Radar Chart</h3>
                  <ResponsiveContainer width="100%" height="90%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <Radar name="Score" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.5} strokeWidth={2} />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            {(skillGapData?.phrasing_suggestions || []).length > 0 && (
              <div className="mt-4 p-4 border border-slate-200 rounded-xl bg-slate-50">
                <h4 className="font-semibold text-slate-700 mb-2">Resume Improvement Suggestions</h4>
                <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
                  {skillGapData.phrasing_suggestions.map((p, i) => <li key={i}>{p}</li>)}
                </ul>
              </div>
            )}
            <button type="button" onClick={downloadReport} className="btn-secondary inline-flex items-center gap-2 mt-4"><Download size={16} /> Download Feedback Report (PDF)</button>
          </>
        )}
      </section>

                  
                  
      <section id="application-tracking" className="p-6 rounded-2xl card-premium">
        <h2 className="text-xl font-bold text-slate-800 mb-4">5. Application Tracking</h2>
        {!hasResumeData ? (
          <div className="p-5 rounded-xl border border-dashed border-slate-300 text-slate-600">Upload your resume to unlock this section</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b">
                    <th className="py-2 pr-4">Job Title</th><th className="py-2 pr-4">Company</th><th className="py-2 pr-4">Date Applied</th><th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {apps.map((a) => {
                    const normalized = String(a.status || "Applied").toLowerCase();
                    return (
                      <tr key={a._id} className="border-b border-slate-100">
                        <td className="py-2 pr-4">{a.job?.title || "-"}</td>
                        <td className="py-2 pr-4">{a.job?.company || "-"}</td>
                        <td className="py-2 pr-4">{a.createdAt ? new Date(a.createdAt).toLocaleDateString() : "-"}</td>
                        <td className="py-2"><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusClass[normalized] || statusClass.applied}`}>{a.status || "Applied"}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-6 pl-4 border-l-2 border-slate-200 space-y-4">
              {apps.map((a) => (
                <div key={`timeline-${a._id}`} className="relative">
                  <span className="absolute -left-[22px] top-1 h-3 w-3 rounded-full bg-indigo-500" />
                  <p className="text-sm font-medium text-slate-700">{a.job?.title || "Application"}</p>
                  <p className="text-xs text-slate-500">{a.createdAt ? new Date(a.createdAt).toLocaleString() : "Date unavailable"} — {a.status || "Applied"}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
      {skillGapOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200">
            <div className="flex justify-between items-center p-5 border-b border-slate-200">
              <h3 className="font-bold text-slate-800 text-lg">Skill Gap & Resume Improvement {skillGapJob && `– ${skillGapJob.title}`}</h3>
              <button type="button" onClick={() => setSkillGapOpen(false)} className="p-2 rounded-xl hover:bg-slate-100"><X size={22} /></button>
            </div>
            <div className="p-5">
              <p className="text-slate-600 mb-4 text-sm">Run analysis to generate feedback and analytics for section 4.</p>
              <button type="button" onClick={runSkillGap} disabled={!selectedFile || skillGapLoading} className="btn-primary disabled:opacity-50">{skillGapLoading ? "Analyzing..." : "Run Skill Gap Analysis"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}