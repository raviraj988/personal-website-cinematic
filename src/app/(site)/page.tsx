import { EseLanding } from "@/components/sections/EseLanding";
import { StructuredData } from "@/components/seo/StructuredData";

/**
 * Landing page.
 *
 * Environment Sovereignty & Equity. Section copy and photography are
 * content-driven from `lib/data/ese-content.ts`; see the ordering note on
 * `EseLanding`.
 */
export default function LandingPage() {
  return (
    <>
      <StructuredData />
      <EseLanding />
    </>
  );
}
