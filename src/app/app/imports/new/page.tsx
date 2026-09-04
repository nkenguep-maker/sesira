import { PremiumImportExperience } from "@/components/imports/premium-import-experience";

type SearchParams = Promise<{ import?: string; ok?: string; errors?: string }>;

export default async function NewImportPage({ searchParams }: { searchParams: SearchParams }) {
  const status = await searchParams;
  return <PremiumImportExperience view="new" status={status} />;
}
