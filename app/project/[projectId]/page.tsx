import { ProjectDetailPage } from "@/features/project/pages/project-detail-page";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { projectId } = await params;
  const { tab } = await searchParams;
  return <ProjectDetailPage key={projectId} projectId={projectId} initialTab={tab} />;
}
