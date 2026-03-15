import AppliedJobsPage from "./AppliedJobsPage";
import TopNavbar from '../../components/TopNavbar';

export default function ApplicationsPage() {
  return (
    <div>
      <TopNavbar title="Application Tracking" subtitle="Track all applied roles and status updates" />
      <AppliedJobsPage />
    </div>
  );
}