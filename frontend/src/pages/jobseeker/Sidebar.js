   import { LayoutDashboard, Briefcase, BarChart3, UserCircle2 } from "lucide-react";
import { NavLink } from "react-router-dom";

const links = [
  { to: "/jobseeker/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/jobseeker/applications", label: "Applications", icon: Briefcase },
  { to: "/jobseeker/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/jobseeker/profile", label: "Profile", icon: UserCircle2 },
];

export default function Sidebar() {
  return (
    <aside className="card-premium p-4 lg:p-5 h-fit lg:sticky lg:top-24">
      <h3 className="text-lg font-bold text-slate-800 mb-4">Applicant Panel</h3>
      <nav className="flex flex-col gap-2">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all ${
                isActive
                  ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                  : "bg-white border-transparent text-slate-600 hover:bg-slate-50 hover:border-slate-200"
              }`
            }
          >
            <Icon size={18} />
            <span className="font-medium">{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}