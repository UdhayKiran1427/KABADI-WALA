import { redirect } from "next/navigation";

// Recyclers now opt in to a lot (5 km broadcast); the collector chooses on the lot page.
export default async function MatchRecyclerPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  redirect(`/collector/lots/${id}`);
}
