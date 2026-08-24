import { LoadingHeader, LoadingMetricGrid, LoadingPage } from "@/components/sesira/loading-skeleton";

export default function AppLoading() {
  return (
    <LoadingPage label="Chargement de l’accueil">
      <LoadingHeader />
      <LoadingMetricGrid />
    </LoadingPage>
  );
}
