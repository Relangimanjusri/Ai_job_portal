import { NavLink } from "react-router-dom";

const links = [
  { label: "Dashboard", href: "#resume-upload" },
  { label: "Applications", href: "#application-tracking" },
  { label: "Analytics", href: "#feedback-analysis" },
  { label: "Profile", href: "#profile-view" },
];

export default function ApplicantSidebar() {
  return (
    <aside className="applicant-sidebar card-premium p-4">
      <h3 className="text-lg font-bold text-slate-800 mb-4">Applicant Panel</h3>
      <nav className="flex flex-col gap-2">
        {links.map((link) => (
          <a key={link.label} href={link.href} className="px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100 font-medium">
            {link.label}
          </a>
        ))}
        <NavLink to="/jobseeker/jobs" className="px-3 py-2 rounded-lg text-indigo-600 hover:bg-indigo-50 font-medium">
          Open Full Jobs Page
        </NavLink>
      </nav>
    </aside>
  );
}