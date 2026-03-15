import ApplicantSidebar from "../../components/ApplicantSidebar";
import AvailableJobsPage from "./AvailableJobsPage";
import ProfilePage from "./ProfilePage";
import AppliedJobsPage from "./AppliedJobsPage";

export default function DashboardPage() {
  return (
    <div className="applicant-dashboard-layout">
      <ApplicantSidebar />
      <main className="dashboard-main-content">
        <AvailableJobsPage embedded />
        <section className="mt-8">
          <ProfilePage embedded />
        </section>
        <section className="mt-8">
          <AppliedJobsPage embedded />
        </section>
      </main>
    </div>
  );
}
