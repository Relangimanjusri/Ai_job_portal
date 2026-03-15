import { useEffect, useState } from "react";
import api from "../../services/api";
import { User, Save } from "lucide-react";

const defaultProfileCards = {
  skills: ["python", "react"],
  education: "B.Tech",
  experience: "2 years",
  certifications: "AWS Certified Cloud Practitioner",
};

export default function ProfilePage({ embedded = false }) {
  const [profile, setProfile] = useState({ name: "", email: "" });
  const [profileCards, setProfileCards] = useState(defaultProfileCards);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [draftCards, setDraftCards] = useState(defaultProfileCards);

  useEffect(() => {
    api.get("/api/auth/profile").then((res) => setProfile(res.data));
  }, []);

  const handleUpdate = async () => {
    try {
      await api.put("/api/auth/profile", { name: profile.name });
      alert("Profile updated!");
    } catch {
      alert("Update failed");
    }
  };

  const openEditModal = () => {
    setDraftCards(profileCards);
    setIsEditOpen(true);
  };

  const saveProfileCards = () => {
    setProfileCards({
      ...draftCards,
      skills: draftCards.skills
        .join(",")
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    });
    setIsEditOpen(false);
  };

  return (
   
    <div className={embedded ? "" : "profile-card"}>
      {embedded && <h2 id="profile-view" className="text-xl font-bold text-slate-800 mb-4">2. Profile View</h2>}
      <div className="profile-card">
        <div className="header">
          <User size={40} />
          <h2>Personal Profile</h2>
        </div>
        <div className="body">
          <label>Name</label>
          <input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
          <label>Email</label>
          <input value={profile.email} disabled className="disabled" />
          <button onClick={handleUpdate} className="btn-save"><Save size={16} /> Save Changes</button>
        </div>

        <div className="mt-6 border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-700">Profile cards</h3>
            <button type="button" className="btn-secondary" onClick={openEditModal}>Edit profile cards</button>
          </div>
          <div className="grid gap-2 text-sm text-slate-700">
            <p><strong>Skills:</strong> {profileCards.skills.join(", ")}</p>
            <p><strong>Education:</strong> {profileCards.education}</p>
            <p><strong>Experience:</strong> {profileCards.experience}</p>
            <p><strong>Certifications:</strong> {profileCards.certifications}</p>
          </div>
        </div>
      </div>

      {isEditOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold mb-4">Edit profile cards</h3>
            <label className="block text-sm font-medium mb-1">Skills (comma separated)</label>
            <input
              className="input-field mb-3"
              value={Array.isArray(draftCards.skills) ? draftCards.skills.join(", ") : draftCards.skills}
              onChange={(e) => setDraftCards({ ...draftCards, skills: e.target.value.split(",") })}
            />
            <label className="block text-sm font-medium mb-1">Education</label>
            <input className="input-field mb-3" value={draftCards.education} onChange={(e) => setDraftCards({ ...draftCards, education: e.target.value })} />
            <label className="block text-sm font-medium mb-1">Experience</label>
            <input className="input-field mb-3" value={draftCards.experience} onChange={(e) => setDraftCards({ ...draftCards, experience: e.target.value })} />
            <label className="block text-sm font-medium mb-1">Certifications</label>
            <input className="input-field mb-4" value={draftCards.certifications} onChange={(e) => setDraftCards({ ...draftCards, certifications: e.target.value })} />
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setIsEditOpen(false)}>Cancel</button>
              <button type="button" className="btn-primary" onClick={saveProfileCards}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}