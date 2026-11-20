import { Footer, Header, PageBand } from "@hikmah/ui";

// Shell only. Classes, materials and roles are built in the LMS phase.
export default function LmsHome() {
  return (
    <div className="hk-page">
      <Header brand="Hikmah LMS" nav={[]} />
      <main style={{ flex: 1 }}>
        <PageBand eyebrow="Students and faculty" title="Hikmah LMS" lead="Classes, materials and announcements for accepted students. Coming in a later phase." />
      </main>
      <Footer
        phone="+92 333 0382121"
        email="info@hikmahinstitute.org.pk"
        whatsapp="https://wa.me/923330382121"
        campuses={["150-A, Sindhi Muslim Society, Block A", "66-A Faisal Street 2, DHA Phase 8"]}
        socials={[]}
        learn={[]}
      />
    </div>
  );
}
