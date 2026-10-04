import { ProjectBillPage } from "@/features/project/pages/project-bill-page";

export default async function Page({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <ProjectBillPage projectId={projectId} />;
}
