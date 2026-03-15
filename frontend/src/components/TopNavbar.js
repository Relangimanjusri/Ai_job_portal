import { Bell, Search } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function TopNavbar({ title, subtitle }) {
  const { user } = useAuth();

  return (
    <div className="card-premium p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-500">Applicant dashboard</p>
        <h1 className="text-2xl font-extrabold text-slate-800">{title}</h1>
        {subtitle && <p className="text-sm text-slate-600 mt-1">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white min-w-[220px] w-full sm:w-auto">
          <Search size={16} className="text-slate-400" />
          <span className="text-sm text-slate-500">Welcome, {user?.name}</span>
        </div>
        <button className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600">
          <Bell size={18} />
        </button>
      </div>
    </div>
  );
}