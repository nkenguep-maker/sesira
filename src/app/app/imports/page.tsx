import { PremiumImportExperience } from "@/components/imports/premium-import-experience";

type SearchParams = Promise<{ import?: string; ok?: string; errors?: string }>;

export default async function ImportsPage({ searchParams }: { searchParams: SearchParams }) {
  const status = await searchParams;
  return <PremiumImportExperience view="home" status={status} />;
}
