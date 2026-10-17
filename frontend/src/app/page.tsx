import { HomePage } from "@/features/public-marketing";
import { JsonLdOrganization } from "@/features/public-marketing/components/JsonLdOrganization";

export default function PaginaHome() {
  return (
    <>
      <JsonLdOrganization />
      <HomePage />
    </>
  );
}
