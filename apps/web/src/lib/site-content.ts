// Homepage and footer copy that admins will later edit from the dashboard (Homepage manager).
// PLACEHOLDERS in [brackets] are waiting on the Hikmah team.

export const CONTACT = {
  phone: "+92 333 0382121",
  whatsapp: "https://wa.me/923330382121", // PLACEHOLDER: confirm this number is on WhatsApp
  email: "info@hikmahinstitute.org.pk",
  campuses: [
    "150-A, Sindhi Muslim Society, Block A",
    "66-A Faisal Street 2, DHA Phase 8",
  ],
  socials: [
    { label: "YouTube", href: "https://www.youtube.com/@hikmahinstitute" }, // PLACEHOLDER: confirm channel URL
    { label: "Instagram", href: "https://www.instagram.com/hikmahinst/" },
    { label: "LinkedIn", href: "https://www.linkedin.com/company/hikmah-inst/" },
  ],
};

export const NAV = [
  { href: "/", label: "Home" },
  { href: "/courses", label: "Courses" },
  { href: "/events", label: "Events" },
  { href: "/mentorship", label: "Mentorship" },
  { href: "/hikmah-at-work", label: "Hikmah at Work" },
  { href: "/about", label: "About" },
];

export const STATS = [
  { value: "350", label: "students in long courses" },
  { value: "50", label: "at Feel Good Fridays each week" },
  { value: "10", label: "years of teaching" },
  { value: "2", label: "campuses in Karachi" },
];

export const RIBBON = [
  "Feel Good Fridays every week",
  "Darse Nizami admissions open",
  "Classes on evenings and weekends",
  "Main and DHA campuses",
  "Ilm · Dawah · Islah · Khidmah",
  "Mentorship circles at universities",
];

export const TESTIMONIALS = [
  {
    quote:
      "Flexible timings and qualified teachers who blend traditional and contemporary learning. Easy to manage both deen and dunya.",
    name: "Dr. Muhammad Usama",
    role: "4th Year, Darse Nizami",
  },
  {
    quote:
      "Hikmah truly feels like home. The teachers and environment have shaped me into a more composed person.",
    name: "Faaiz Hassan",
    role: "4th Year, Darse Nizami",
  },
  {
    quote:
      "The flexible timings and supportive teachers make it feel like a second home.",
    name: "Faheem Vohra",
    role: "6th Year, Darse Nizami",
  },
  {
    quote: "The teachers opened a new lens through which I now see the world.",
    name: "Mehboob Muhammad Jamall",
    role: "3rd Year, Quran and Hadith",
  },
];

export const TALKS = [
  {
    id: "e5mKq5_epDw",
    series: "Feel Good Fridays",
    title: "The Economics of Time",
    speaker: "Maulana Dr. Muhammad Areeb Nafey",
  },
  {
    id: "IILeltyC6P4",
    series: "Journey Through the Quran",
    title: "Faith on Our Own Terms?",
    speaker: "Maulana Jawwad Mehmood",
  },
  {
    id: "9EO2BbbO63c",
    series: "Seerah",
    title: "The Strength to Be Gentle: Lessons in Mercy",
    speaker: "Maulana Khizer Khalid",
  },
];

// ---------- About page (from hikmahinstitute.org.pk/about-us) ----------
export const PILLARS = [
  { name: "Ilm", ar: "عِلْم", text: "Authentic Islamic knowledge rooted in the Qur'an and Sunnah." },
  { name: "Dawah", ar: "دَعْوَة", text: "Calling towards Allah with wisdom, clarity and compassion." },
  { name: "Islah", ar: "إِصْلَاح", text: "Personal and societal reform through spiritual and moral development." },
  { name: "Khidmah", ar: "خِدْمَة", text: "Serving humanity as a responsibility of faith." },
];

const PLACEHOLDER_PHOTO = "/people/placeholder.svg"; // PLACEHOLDER: swap for real photos when the team sends them

export const PATRON = {
  name: "Mufti Muhammad Taqi Usmani",
  role: "Patron",
  photo: PLACEHOLDER_PHOTO,
  bio: [
    "Born in 1943 in Deoband, India, Mufti Muhammad Taqi Usmani is one of the most respected scholars of the Muslim world, known for his work in Hadith, Fiqh, Islamic economics and Tasawwuf.",
    "He served on the Shariat Appellate Bench of the Supreme Court of Pakistan from 1982 to 2002, chairs the International Shariah Council of AAOIFI, is Vice President of Darul Uloom Karachi, and has authored more than 60 books.",
  ],
};

export const BOARD = [
  { name: "Dr. Zeeshan Ahmed", photo: PLACEHOLDER_PHOTO, bio: "Rector and Dean, and Associate Professor at the Karachi School of Business and Leadership (KSBL). More than 20 years in teaching, training and consulting; PhD in Finance from Mississippi State University, CFA, and has passed the CPA examinations." },
  { name: "Mufti Umair Feroz", photo: PLACEHOLDER_PHOTO, bio: "Has taught Dars-e-Nizami for over 16 years, serves at the Dar-ul-Iftaa of Jamia Dar-ul-Uloom Karachi, and manages a pharmaceutical company." },
  { name: "Mufti Muhammad Zahid Sangharwi", photo: PLACEHOLDER_PHOTO, bio: "Head of Shariah Compliance at Pak-Qatar Family Takaful, Resident Shariah Adviser for Soneri Bank, and conducts Dars-e-Quran and Hadith sessions." },
  { name: "Dr. Amanullah Kassim", photo: PLACEHOLDER_PHOTO, bio: "Chairman of Macter International Limited and of the All Pakistan Textile Mills Association, and president of the Zubaida Machiyara Trust, which runs over 45 clinics in Karachi." },
  { name: "Shabbir Kassim", photo: PLACEHOLDER_PHOTO, bio: "[Bio to be added]" },
];

export const COFOUNDERS = [
  { name: "Maulana Shahzaib Aijaz", photo: "/people/shahzaib-aijaz.jpg", bio: "CEO and Director in the non-profit sector." },
  { name: "Maulana Khizer Khalid", photo: "/people/khizer-khalid.jpg", bio: "Entrepreneur and business owner, and senior faculty at Hikmah Institute." },
  { name: "Saad Jafri", photo: "/people/saad-jafri.jpg", bio: "Entrepreneur and business owner." },
];
