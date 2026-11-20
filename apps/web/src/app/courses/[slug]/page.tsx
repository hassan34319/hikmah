import { OfferingDetail } from "@/components/OfferingDetail";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <OfferingDetail slug={slug} section="courses" />;
}
