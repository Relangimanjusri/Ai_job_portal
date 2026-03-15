import { Outlet } from "react-router-dom";
import Sidebar from "../../components/Sidebar";

export default function JobseekerLayout() {
  return (
    <div className="grid lg:grid-cols-[260px_1fr] gap-6 items-start">
      <Sidebar />
      <div>
        <Outlet />
      </div>
    </div>
  );
}