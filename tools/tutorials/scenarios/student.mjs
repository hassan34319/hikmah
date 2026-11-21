// Student and parent side, about a minute. Each step's `say` line is the voiceover.
// Real emails go to DEMO_INBOX plus-addresses (+hk.student, +hk.parent). Remove later with demo-cleanup.sql.
export const options = { auth: false };
export const intro = { title: 'Using the Hikmah website', sub: 'Events, courses and programs', say: "Here's how to use the Hikmah Institute website, from events and courses to our programs, in about two minutes." };
export const outro = { title: 'See you there', sub: 'hikmahinstitute.org.pk', say: 'JazakAllah khair. We look forward to seeing you, in sha Allah.' };

const chip = (page, name, value) => page.locator(`label:has(input[name="${name}"][value="${value}"])`).first();
const EVENT = /Enslaved/;
const STUDENT = process.env.STUDENT_TAG ?? `hk.student${Date.now().toString(36).slice(-4)}`;
// Each WhatsApp number can belong to one account only, so every run uses a fresh one.
const PHONE = `0300 ${String(Math.floor(1000000 + Math.random() * 8999999))}`;

export const chapters = [
  {
    title: 'The website', sub: 'Open to everyone',
    async run({ page, d, BASE }) {
      await d.goto(`${BASE}/`);
      d.step('The Hikmah website', 'Courses, events and programs', { say: 'Start at the Hikmah website. Courses, events and programs are open to everyone.', wide: true });
      await d.wait(2500);
    },
  },
  {
    title: 'About Hikmah', sub: 'Who we are',
    async run({ page, d, BASE }) {
      await d.click(page.locator('header').getByRole('link', { name: 'About', exact: true }).first(), { nav: true });
      d.step('About us', 'Mission, pillars and the people behind Hikmah', { say: 'The About page explains our mission, our four pillars, and the scholars and team behind Hikmah.', wide: true });
      await d.wait(1200);
      await d.scrollBy(650); await d.wait(900);
      await d.scrollBy(900); await d.wait(900);
      await d.scrollBy(900); await d.wait(900);
    },
  },
  {
    title: 'Find an event', sub: 'No account needed to browse',
    async run({ page, d, BASE }) {
      await d.goto(`${BASE}/events`);
      d.step('Events', 'Every upcoming talk and conference', { say: 'Open Events to see every upcoming talk, halaqah and conference.', wide: true });
      await d.wait(1500);
      await d.click(page.getByRole('link', { name: EVENT }).first(), { nav: true });
      d.step('The event page', 'Date, speaker, venue and seats left', { say: 'Each event shows the date, the speaker, the venue, and how many seats are left.' });
      await d.point(page.getByRole('link', { name: /^Register/ }).first());
      await d.wait(2000);
    },
  },
  {
    title: 'Sign up', sub: 'An email code, no password',
    async run({ page, d, BASE }) {
      if (!/\/events\//.test(page.url())) { await d.goto(`${BASE}/events`); await d.click(page.getByRole('link', { name: EVENT }).first(), { nav: true }); }
      await d.click(page.getByRole('link', { name: /^Register/ }).first(), { nav: true });
      d.step('Sign in with your email', 'We email you a code', { say: "Tap Register and enter your email. We'll send you a sign-in code, so there's no password to remember." });
      await d.type(page.locator('input[name="email"]'), d.email(STUDENT));
      await d.click(page.getByRole('button', { name: 'Send me a code' }));
      await page.locator('input[name="code"]').waitFor({ timeout: 60_000 }).catch(() => {});
      const code = await d.ask(`Check ${d.email(STUDENT)} and type the code here (or paste the sign-in link):`);
      if (/^https?:\/\//.test(code)) await page.goto(code, { waitUntil: 'networkidle' });
      else {
        await d.type(page.locator('input[name="code"]'), code.replace(/\D/g, ''));
        await d.click(page.getByRole('button', { name: 'Sign in', exact: true }));
      }
      await d.until(() => page.waitForURL((u) => !u.pathname.startsWith('/sign-in'), { timeout: 60_000 }));
      await page.waitForLoadState('networkidle');
    },
  },
  {
    title: 'Your profile', sub: 'Once, then forms fill themselves',
    async run({ page, d }) {
      if (!page.url().includes('/complete-profile')) return;
      d.step('A short profile, once', 'Name, WhatsApp and date of birth', { say: 'The first time only, you fill in a short profile: your name, WhatsApp number and date of birth.' });
      await d.type(page.locator('input[name="full_name"]'), 'Abdullah Khan');
      await d.click(chip(page, 'gender', 'male'));
      await d.type(page.locator('input[name="phone"]'), PHONE);
      await page.locator('input[name="date_of_birth"]').fill('2003-06-15');
      d.step('Studies, area and interests', 'Up to five interests', { say: 'Add where you study or work, your area of Karachi, and up to five interests.' });
      await d.click(chip(page, 'occupation_type', 'student'));
      await d.type(page.locator('input[name="university"]'), 'NED University');
      await page.locator('input[name="degree"]').fill('BS Computer Science');
      await page.locator('input[name="education_year"]').fill('3rd year');
      await d.type(page.locator('input[name="area"]'), 'Gulshan-e-Iqbal');
      for (const i of ['Seerah', 'Quran', 'Family and marriage']) await d.click(chip(page, 'interests', i));
      await page.locator('select[name="heard_from"]').selectOption({ index: 1 }).catch(() => {});
      d.step('Stay in the loop', 'Email updates about new events', { say: 'Tick email updates to hear about new courses and events.' });
      await d.check(page.locator('input[name="email_opt_in"]'));
      await d.wait(800);
      await d.click(page.getByRole('button', { name: /Save and continue/ }));
      await d.until(() => page.waitForURL((u) => !u.pathname.startsWith('/complete-profile'), { timeout: 60_000 }));
      await page.waitForLoadState('networkidle');
    },
  },
  {
    title: 'Register and get your ticket', sub: 'QR ticket and calendar',
    async run({ page, d }) {
      d.step('Register in one tap', 'Your details are already filled in', { say: 'Your details are already filled in, so registering takes one tap.' });
      await d.wait(1000);
      await d.click(page.locator('form:has(input[name="slug"]) button[type="submit"]'));
      await d.until(() => page.waitForURL(/\/account\/registrations\//, { timeout: 60_000 }));
      await page.waitForLoadState('networkidle');
      d.step("You're registered", 'Show the QR ticket at the door', { say: "You're in. Your QR ticket is here and in your email. Just show it at the door." });
      await d.point(page.locator('svg, img[alt*="QR" i]').first()).catch(() => {});
      await d.wait(2500);
      d.step('Calendar and My account', 'Everything in one place', { say: 'Add it to your calendar, and find all your registrations under My account.' });
      await d.point(page.getByText('Add to Google Calendar').first());
      await d.wait(1500);
    },
  },
  {
    title: 'Apply for a course', sub: 'Darse Nizami and more',
    async run({ page, d, BASE }) {
      await d.goto(`${BASE}/courses`);
      d.step('Courses', 'Long courses for students and professionals', { say: 'Courses work the same way. Browse them, open one, and press Apply now.', wide: true });
      await d.wait(1200);
      await d.click(page.getByRole('link', { name: /Darse Nizami/ }).first(), { nav: true });
      await d.wait(1200);
      await d.click(page.locator('main a[href^="/register/"]').first(), { nav: true });
      d.step('The application', 'Your details are filled in, answer a few questions', { say: 'Your details are already filled in. Just answer a few questions about the course, like your preferred campus and batch.' });
      await d.click(chip(page, 'preferred_campus', 'Main Campus'));
      await d.click(chip(page, 'preferred_batch', 'Weekend morning'));
      await d.click(chip(page, 'prior_study', 'Yes, events only'));
      await d.type(page.locator('textarea[name="why_join"]'), 'I want to study the deen properly alongside my degree.');
      d.step('Application received', 'Admissions will email you the next step', { say: 'Submit, and our admissions team will email you about the next step.' });
      await d.click(page.getByRole('button', { name: /Submit application/ }));
      await d.until(() => page.waitForURL(/\/account\/registrations\//, { timeout: 60_000 }));
      await page.waitForLoadState('networkidle');
      await d.point(page.locator('main h1, main h2').first()).catch(() => {});
      await d.wait(1800);
    },
  },
  {
    title: 'Hifz registration for parents', sub: 'No account needed',
    async run({ page, d, BASE }) {
      await d.goto(`${BASE}/hifz`);
      d.step('Hifz Program', 'Parents register children here', { say: 'Parents can register their children for the Hifz program. No account needed.', wide: true });
      await d.wait(1500);
      await d.click(chip(page, 'c1_track', 'Hifz'));
      d.step('Add each child', 'Brothers can be registered together', { say: "Add each child's details. Brothers can be registered together in one form." });
      await d.type(page.locator('input[name="c1_name"]'), 'Abdul Rahman');
      await d.type(page.locator('input[name="c1_age"]'), '8');
      await d.click(chip(page, 'c1_in_school', 'Yes'));
      await page.locator('input[name="c1_school"]').fill('The City School');
      await d.click(chip(page, 'c1_prior_study', 'Yes'));
      await page.locator('select[name="c1_level"]').selectOption('Nazra');
      await d.click(page.getByRole('button', { name: '+ Add another child' }));
      await d.click(chip(page, 'c2_track', 'Nazra'));
      await d.type(page.locator('input[name="c2_name"]'), 'Yusuf');
      await page.locator('input[name="c2_age"]').fill('7');
      await page.locator('label:has(input[name="c2_in_school"][value="Yes"])').click();
      await page.locator('input[name="c2_school"]').fill('The City School');
      await page.locator('label:has(input[name="c2_prior_study"][value="No"])').click();
      d.step('Parent details, then submit', 'A receipt is emailed to you', { say: "Add the parents' details and submit. You'll get a confirmation email, and our team will be in touch." });
      await d.type(page.locator('input[name="father_name"]'), 'Kamran Khan');
      await page.locator('input[name="father_phone"]').fill('0321 7654321');
      await page.locator('input[name="father_email"]').fill(d.email('hk.parent'));
      await page.locator('input[name="mother_name"]').fill('Saima Kamran');
      await page.locator('input[name="address"]').fill('House 12, Block 13-D');
      await page.locator('input[name="area"]').fill('Gulshan-e-Iqbal');
      await page.locator('input[name="city"]').fill('Karachi');
      await d.click(page.getByRole('button', { name: /Register 2 children/ }));
      await d.until(() => page.getByText('Registration received').waitFor({ timeout: 60_000 }));
      await d.point(page.getByText('Registration received'));
      await d.wait(2000);
    },
  },
  {
    title: 'Hikmah at Work', sub: 'Sessions at your workplace',
    async run({ page, d, BASE }) {
      await d.goto(`${BASE}/hikmah-at-work`);
      d.step('Hikmah at Work', 'Talks and workshops at your company', { say: 'Companies can invite Hikmah for talks and workshops at their workplace, from the Hikmah at Work page.', wide: true });
      await d.wait(1500);
      const form = page.locator('form:has(input[name="organisation"])');
      d.step('Request a session', 'No account needed', { say: "Choose a format, add your company's details, and send the request. Our team will get back to you." });
      await d.point(form, 0.5, 0.05);
      await page.locator('select[name="format"]').selectOption({ index: 1 }).catch(() => {});
      await d.type(page.locator('input[name="organisation"]'), 'Systems Ltd');
      await page.locator('input[name="topic"]').fill('Balancing work and worship');
      await d.type(page.locator('input[name="name"]'), 'Nida Hussain');
      await page.locator('input[name="designation"]').fill('HR Manager');
      await page.locator('input[name="email"]').fill(d.email('hk.nida.hussain'));
      await page.locator('input[name="phone"]').fill('0301 2223344');
      await d.click(page.getByRole('button', { name: /Send invitation request/ }));
      await d.until(() => page.getByText(/received|JazakAllah/i).first().waitFor({ timeout: 60_000 }));
      await d.point(page.getByText(/received|JazakAllah/i).first());
      await d.wait(1800);
    },
  },
];
