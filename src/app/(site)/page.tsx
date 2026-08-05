import { CinematicLanding } from "@/components/sections/CinematicLanding";
import { StructuredData } from "@/components/seo/StructuredData";

/**
 * Landing page — spec §8.
 *
 * Section order and visibility are content-driven. Collaborators and Tools stay
 * switched off until approved profiles and tool entries exist, so neither an
 * empty directory nor a fake action can appear (spec §8.6, §8.7, §27).
 */
export default function LandingPage() {
  return (
    <>
      <StructuredData />
      <CinematicLanding />
    </>
  );
}
