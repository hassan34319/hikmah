// Content for Mentorship Circle, Hikmah at Work and Hifz, taken from the current hikmahinstitute.org.pk pages.

export const MENTORSHIP_AREAS = [
  { group: "Personal Growth", items: ["Anger Management", "Time Management", "Stress Management", "Confidence Building", "Personal Habits", "Goal Setting", "Work-Life Balance"] },
  { group: "Faith & Spiritual Development", items: ["Crisis of Faith", "Tazkiyah & Spiritual Growth", "Jurisprudence Matters", "Identity Questions"] },
  { group: "Relationships & Family", items: ["Marital Affairs", "Parenting", "Family Conflicts", "Personal Relationships"] },
  { group: "Career & Life Direction", items: ["Academics", "Career Guidance", "Professional Counselling", "Business Guidance", "Change Management"] },
  { group: "Wellbeing & Recovery", items: ["Mid-life Challenges", "Addiction Problems", "Life Transitions"] },
];

export const MENTORS = [
  { name: "Maulana Sajjad Sheikh", photo: "/people/sajjad-sheikh.jpg", role: "NLP coach, counsellor and university educator, with a background in marketing and strategy." },
  { name: "Maulana Shahzaib Aijaz", photo: "/people/shahzaib-aijaz.jpg", role: "CEO and Director in the non-profit sector; co-founder of Hikmah Institute." },
  { name: "Saad Jafri", photo: "/people/saad-jafri.jpg", role: "Entrepreneur and business owner; co-founder of Hikmah Institute." },
  { name: "Maulana Khizer Khalid", photo: "/people/khizer-khalid.jpg", role: "Entrepreneur and business owner; co-founder and senior faculty at Hikmah Institute." },
  { name: "Mufti Khalid Bukhari", photo: "/people/khalid-bukhari.jpg", role: "Culture consultant and trainer; head of Dawah Courses at Hikmah Institute." },
  { name: "Maulana Faheem Vohra", photo: "/people/faheem-vohra.jpg", role: "Corporate training professional and university educator, with an FMCG sales and training background." },
  { name: "Maulana Jawwad Mehmood", photo: "/people/jawwad-mehmood.jpg", role: "Entrepreneur and business owner; head of initiatives at Hikmah Institute." },
];

export const MENTORSHIP_STEPS = [
  "Submit your request",
  "We match you with a suitable mentor",
  "Book your appointment with your mentor",
  "Begin your mentorship conversations",
];

export const COURSE_OPTIONS = ["Quranic Sciences", "Quranic Reflections", "Quran & Hadith Diploma", "Darse Nizami", "Others"];
export const BATCH_OPTIONS = ["Weekdays Evening", "Weekends Morning", "Weekends Afternoon"];
export const ENROLLMENT_OPTIONS = ["Currently Enrolled", "Graduated"];

/** Organisations Hikmah at Work has run sessions with (names only until logos are provided). */
export const WORK_PARTNERS = ["SPAR", "PDMS", "Shield", "Liquid Technologies", "Trajital", "Rholab", "Oceanic Group", "Charity Right Pakistan", "Humantek"];

export const WORK_FORMATS = ["Employee Engagement", "Workshop", "Keynote", "Talk / Interactive Session", "Panel Discussion", "Not sure yet"];

export const WORK_THEMES = [
  { title: "Purpose & Meaning", items: ["Finding purpose beyond professional success", "Balancing career, family and faith", "Living intentionally in a distracted world"] },
  { title: "Character & Ethics", items: ["Integrity when nobody is watching", "Ihsan and excellence at work", "Ethical decision-making"] },
  { title: "Leadership", items: ["Trust, responsibility and accountability", "Leadership as an amanah", "Leading with empathy and integrity", "Building trust within teams", "The character of effective leaders"] },
  { title: "Wellbeing & Resilience", items: ["Managing stress through a faith-based perspective", "Dealing with setbacks and uncertainty", "Digital distraction and the attention economy", "Maintaining inner balance in a demanding world"] },
  { title: "Relationships", items: ["Building healthy workplace relationships", "Conflict, forgiveness and emotional maturity", "Respect and empathy in professional environments"] },
  { title: "Faith & Professional Life", items: ["Faith in the workplace", "Balancing professional and spiritual responsibilities", "Islamic values in everyday professional life"] },
];

export const WORK_STEPS = ["Tell us about your audience", "We understand your objective", "We recommend a topic and format", "We conduct the session"];

export const WORK_FAQ = [
  { q: "Who can invite Hikmah for a corporate session?", a: "Companies, organisations, educational institutions, NGOs, professional communities and other teams can invite Hikmah for a session." },
  { q: "Can we request a specific topic?", a: "Yes. You can suggest a topic through the invitation form. Our team can also recommend a suitable theme based on your audience and objectives." },
  { q: "Can Hikmah conduct sessions at our office?", a: "Yes. The Corporate Outreach initiative is designed to bring Hikmah's sessions directly to workplaces and organisations." },
  { q: "How much advance notice is required to arrange a session?", a: "We recommend reaching out as early as possible so that we can understand your requirements and coordinate availability." },
];

export const HIFZ = {
  ages: "Boys, ages 7 to 12", // PLACEHOLDER: the old site says both 7-10 and 7-12
  schedule: ["Monday to Saturday, 8:00am to 2:00pm", "Friday, 8:00am to 12:00pm"],
  location: "Main Campus, Sindhi Muslim Society (SMCHS)",
  pillars: [
    { title: "Daily Hifz", text: "Structured daily memorization with revision, guided by qualified teachers." },
    { title: "Daily tarbiyah", text: "Character building every day: adab, discipline, respect and spiritual awareness." },
    { title: "Seerah integration", text: "The life of the Prophet ﷺ taught as living guidance, not distant history." },
    { title: "Sports and physical activity", text: "Structured sports so boys grow strong in body as well as heart." },
    { title: "Tech and life skills", text: "Guided exposure to technology and practical skills for the world they will lead." },
  ],
  environment: ["Air-conditioned classrooms", "CCTV-monitored premises", "Indoor games and a multi-purpose court", "A friendly, structured atmosphere"],
  tracks: ["Qaida", "Nazra", "Hifz", "Girdaan"],
  levels: ["Qaida", "Nazra", "Partial Hifz"],
  qualifications: ["Doctorate / PhD", "Postgraduate / Masters", "Graduate / Bachelors", "A Levels / Intermediate", "Matric / O Levels"],
};
