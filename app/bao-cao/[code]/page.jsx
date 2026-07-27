import { notFound } from 'next/navigation';
import { REPORTS, getReport } from '@/lib/reports';
import ReportView from '@/components/ReportView';

export function generateStaticParams() {
  return REPORTS.map((r) => ({ code: r.slug }));
}

export function generateMetadata({ params }) {
  const r = getReport(params.code);
  return { title: r ? `${r.code} — ${r.name} | HQ Group` : 'Không tìm thấy báo cáo' };
}

export default function ReportPage({ params }) {
  const report = getReport(params.code);
  if (!report) notFound();
  return <ReportView report={report} />;
}
