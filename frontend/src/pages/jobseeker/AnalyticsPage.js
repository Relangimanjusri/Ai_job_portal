import TopNavbar from '../../components/TopNavbar';

export default function AnalyticsPage() {
  return (
    <div>
      <TopNavbar title="Analytics" subtitle="Use dashboard page to generate live resume analytics" />
      <div className="card-premium p-6 text-slate-600">
        Analytics is integrated inside the Dashboard for resume-aware insights and downloadable feedback report.
      </div>
    </div>
  );
}
