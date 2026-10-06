import type { Metadata } from "next";
import SkillCatalogPage from "@/components/learn/SkillCatalogPage";

export const metadata: Metadata = { title: "Math — Learn | Karman" };

export default function Page() {
  return <SkillCatalogPage subject="math" />;
}
