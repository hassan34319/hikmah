import { Footer, Header, PageBand } from "@hikmah/ui";

// Shell only. Classes, materials and roles are built in the LMS phase.
export default function LmsHome() {
  return (
    <div className="hk-page">
      <Header brand="Hikmah LMS" nav={[]} />
      <main style={{ flex: 1 }}>
        <PageBand eyebrow="Students and faculty" title="Hikmah LMS" lead="Classes, materials and announcements for accepted students. Coming in a later phase." />
      </main>
      <Footer />
    </div>
  );
}
