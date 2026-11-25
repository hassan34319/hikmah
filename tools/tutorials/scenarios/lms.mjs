// Hikmah Classes (the LMS): admin setup, teacher, student. One continuous recording.
// Needs migrations 12-13 and prep-lms.mjs (QS sections, subjects, the teacher role, four applicants, three placed).
import fs from 'node:fs';
import path from 'node:path';

const QS = '10000000-0000-4000-8000-000000000001';
const STUDENT = 'Ayesha Noor';
const TEACHER = 'Imran Siddiqui';
const ASSETS = path.resolve('out/assets');
const SLIDES = path.join(ASSETS, 'Lesson 1 - The Arabic noun.pdf');
const HOMEWORK = path.join(ASSETS, 'Ayesha Noor - Surah Al-Asr.pdf');

export const intro = { title: 'Hikmah Classes', sub: 'For admins, teachers and students', say: "This is Hikmah Classes, our learning portal. We'll set up a class, teach it, and take it as a student." };
export const outro = { title: 'Hikmah Classes', sub: 'Teach, learn, keep track', say: "That's Hikmah Classes, from setup to results. JazakAllah khair." };

const states = {};
async function as(who, { ctx, page }) {
  const file = { admin: '.auth.json', teacher: '.auth-hk.teacher.json', student: '.auth-hk.lms.ayesha.json' }[who];
  states[who] ??= JSON.parse(fs.readFileSync(file, 'utf8'));
  await ctx.clearCookies();
  await ctx.addCookies(states[who].cookies);
  await page.evaluate(() => sessionStorage.removeItem('__hk_pos')).catch(() => {});
}
const okAlert = (page) => page.locator('.ad-alert--ok, .ad-alert--err, .lm-ok, .lm-err').first();
async function saved(page, d, loc = okAlert(page)) {
  await d.until(() => loc.waitFor({ timeout: 30_000 }));
  const t = (await loc.textContent())?.trim(); console.log('   ->', t);
  if (await loc.evaluate((el) => el.className.includes('err'))) throw new Error(`Save failed: ${t}`);
}
const chip = (scope, text) => scope.locator('.ad-chipset label', { hasText: new RegExp(`^\\s*${text}\\s*$`) });

export const chapters = [
  {
    title: 'Set up a course', sub: 'Admin',
    async run(c) {
      const { page, d, BASE } = c;
      await as('admin', c);
      await d.goto(`${BASE}/admin/lms`);
      d.step('Classes', 'Every course, its sections and teachers', { say: 'Admins set up each course under Classes.', wide: true });
      await d.wait(1200);
      await d.click(page.locator('a.lm-course', { hasText: 'Quranic Sciences' }), { nav: true });
      d.step('Sections', 'Weekdays, weekends, each campus', { say: 'Sections split the intake, like weekdays and weekends. Add one with a name and a campus.' });
      const add = page.locator('form.lm-inline');
      await d.type(add.locator('input[name="name"]'), 'Weekend Afternoon');
      await d.select(add.locator('select[name="venue_id"]'), /Main Campus/);
      await d.click(page.getByRole('button', { name: 'Add section' }));
      await saved(page, d);
      await d.wait(900);

      await d.click(page.locator('.ad-tabs a', { hasText: 'Subjects and teachers' }), { nav: true });
      d.step('Who teaches what', 'Assign teachers by subject and section', { say: 'Next, assign teachers. Pick the subject, the teacher, and the sections they teach.' });
      const f = page.locator('form', { has: page.getByRole('button', { name: 'Assign teacher' }) });
      await d.select(f.locator('select[name="subject_id"]'), /Quranic Arabic/);
      await d.select(f.locator('select[name="teacher_id"]'), new RegExp(TEACHER));
      await d.click(f.getByRole('button', { name: 'Assign teacher' }));
      await saved(page, d, f.locator('.ad-alert'));
      await d.point(page.locator('.lm-matrix tbody tr', { hasText: 'Quranic Arabic' }));
      await d.wait(1400);

      await d.click(page.locator('.ad-tabs a', { hasText: 'Timetable' }), { nav: true });
      d.step('Timetable', 'One form for several sections and days', { say: 'Then build the weekly timetable: sections, days, time, subject and room, all in one go.' });
      const t = page.locator('form', { has: page.getByRole('button', { name: 'Add to timetable' }) });
      await d.check(chip(t.locator('fieldset').first(), 'Weekdays').locator('input'));
      await d.check(chip(t.locator('fieldset').nth(1), 'Mon').locator('input'));
      await d.check(chip(t.locator('fieldset').nth(1), 'Wed').locator('input'));
      await d.fill(t.locator('input[name="starts"]'), '18:00');
      await d.fill(t.locator('input[name="ends"]'), '19:30');
      await d.select(t.locator('select[name="subject_id"]'), /Quranic Arabic/);
      await d.select(t.locator('select[name="teacher_id"]'), new RegExp(TEACHER));
      await d.type(t.locator('input[name="room"]'), 'Room 2');
      await d.click(t.getByRole('button', { name: 'Add to timetable' }));
      await saved(page, d, t.locator('.ad-alert'));
      // A second slot for the weekend section, off the main path
      await d.until(async () => {
        await page.reload({ waitUntil: 'networkidle' });
        const t2 = page.locator('form', { has: page.getByRole('button', { name: 'Add to timetable' }) });
        await chip(t2.locator('fieldset').first(), 'Weekend Morning').locator('input').setChecked(true, { force: true });
        await chip(t2.locator('fieldset').nth(1), 'Sat').locator('input').setChecked(true, { force: true });
        await t2.locator('input[name="starts"]').fill('10:00'); await t2.locator('input[name="ends"]').fill('11:30');
        await t2.locator('select[name="subject_id"]').selectOption({ label: 'Quranic Arabic' });
        await t2.locator('select[name="teacher_id"]').selectOption({ label: TEACHER });
        await t2.locator('input[name="room"]').fill('Room 4');
        await t2.getByRole('button', { name: 'Add to timetable' }).click();
        await t2.locator('.ad-alert').waitFor({ timeout: 30_000 });
        await page.reload({ waitUntil: 'networkidle' });
      });
      d.step('The week at a glance', '', { say: 'Each section gets its own week.', wide: true });
      await d.point(page.locator('.lm-tt').first());
      await d.wait(1600);
    },
  },
  {
    title: 'Place students', sub: 'Admin',
    async run(c) {
      const { page, d, BASE } = c;
      await as('admin', c);
      await d.goto(`${BASE}/admin/offerings/${QS}/admissions`);
      d.step('Select into a section', 'In Admissions, choose the section', { say: 'Students arrive through Admissions. When you select an applicant, you also choose their section.' });
      await d.check(page.locator('tbody tr', { hasText: STUDENT }).first().locator('input[type="checkbox"]'));
      const f = page.locator('form', { has: page.locator('select[name="decision"]') });
      await d.select(f.locator('select[name="decision"]'), 'selected');
      await d.select(f.locator('select[name="section_id"]'), /Weekdays/);
      await d.click(f.getByRole('button', { name: /^Mark/ }));
      await saved(page, d, f.locator('.ad-alert'));
      d.step('Send the welcome', 'Student ID and a link to My classes', { say: 'Send the decision. They get their student ID and a link to their classes.' });
      await d.click(page.getByRole('button', { name: /^Email \d+ decision/ }));
      await saved(page, d);
      await d.wait(800);

      await d.goto(`${BASE}/admin/lms/${QS}`);
      d.step('The class list', 'Move students between sections any time', { say: 'Every student is listed with their section. Tick students to move them between sections at any time.', wide: true });
      const rowA = page.locator('tbody tr', { hasText: STUDENT }).first();
      await d.point(rowA);
      const sid = (await rowA.locator('.lm-sid').textContent())?.trim();
      if (sid) d.note('student_id', sid);
      await d.wait(1600);
    },
  },
  {
    title: 'Post class materials', sub: 'Teacher',
    async run(c) {
      const { page, d, BASE } = c;
      await as('teacher', c);
      await d.goto(`${BASE}/teach`);
      d.step('Teaching', 'Classes, today and what to mark', { say: 'Teachers have their own Teaching page, with their classes, today’s timetable and anything to mark.', wide: true });
      await d.wait(1500);
      await d.click(page.locator('.lm-head__actions a', { hasText: 'Post material' }), { nav: true });
      d.step('Post material', 'Upload once for every section', { say: 'To share slides, choose the subject and sections, give it a title and a week, and drop in the file.' });
      const f = page.locator('form.lm-editor');
      await d.select(f.locator('select[name="scope"]'), /Quranic Arabic/);
      await d.type(f.locator('input[name="title"]'), 'Lesson 1: The Arabic noun');
      await d.type(f.locator('input[name="topic"]'), 'Week 1');
      await d.type(f.locator('textarea[name="body"]'), 'Please go through these slides before Monday’s class.');
      await d.upload(f.locator('.lm-drop input[type="file"]'), SLIDES);
      await d.until(() => f.locator('.lm-files li').first().waitFor({ timeout: 60_000 }));
      await d.point(f.locator('.lm-files li').first());
      d.step('Students are emailed', 'Optional, ticked by default', { say: 'Post it, and every student in those sections gets an email.' });
      await d.point(f.locator('.lm-check'));
      await d.click(f.getByRole('button', { name: 'Post material' }));
      await d.until(() => page.waitForURL(/\/teach\/materials\?saved/, { timeout: 60_000 }));
      await page.waitForLoadState('networkidle');
      await d.wait(1200);

      await d.click(page.locator('.lm-head__actions a', { hasText: 'Announce' }), { nav: true });
      d.step('Announcements', 'Notices like a class change', { say: 'Announcements work the same way, for notices like a change of class.' });
      await d.select(page.locator('select[name="scope"]'), /Quranic Arabic/);
      await d.type(page.locator('input[name="title"]'), 'Saturday class starts at 10:30 this week');
      await d.type(page.locator('textarea[name="body"]'), 'Assalamu alaikum, this Saturday we start half an hour later, at 10:30. See you then, in sha Allah.');
      await d.click(page.getByRole('button', { name: 'Post announcement' }));
      await d.until(() => page.waitForURL(/saved=announcement/, { timeout: 60_000 }));
      await page.waitForLoadState('networkidle');
      await d.wait(1200);
    },
  },
  {
    title: 'Set an assignment', sub: 'Teacher',
    async run(c) {
      const { page, d, BASE } = c;
      await as('teacher', c);
      await d.goto(`${BASE}/teach/assignments/new`);
      d.step('Set an assignment', 'Instructions, due date and marks', { say: 'Assignments have instructions, an optional worksheet, a due date and total marks.' });
      await d.select(page.locator('select[name="scope"]'), /Quranic Arabic/);
      await d.type(page.locator('input[name="title"]'), 'Translate Surah Al-Asr');
      await d.type(page.locator('textarea[name="instructions"]'), 'Translate the three ayat and write one lesson you take from the surah. Typed or a photo of handwritten work is fine.');
      await d.point(page.locator('input[name="due_at"]'));
      await d.fill(page.locator('input[name="max_marks"]'), '10');
      await d.click(page.getByRole('button', { name: 'Set assignment' }));
      await d.until(() => page.waitForURL(/\/teach\/assignments\/[0-9a-f-]{36}/, { timeout: 60_000 }));
      await page.waitForLoadState('networkidle');
      d.step('Track hand-ins', 'Who has handed in, and who hasn’t', { say: 'The assignment page tracks who has handed in, and who still hasn’t.', wide: true });
      await d.point(page.locator('.lm-stats'));
      await d.wait(1800);
    },
  },
  {
    title: 'Make a quiz', sub: 'Teacher',
    async run(c) {
      const { page, d, BASE } = c;
      await as('teacher', c);
      await d.goto(`${BASE}/teach/quizzes/new`);
      d.step('New quiz', 'Optional time limit and closing time', { say: 'Quizzes can have a time limit and a closing time.' });
      await d.select(page.locator('select[name="scope"]'), /Quranic Arabic/);
      await d.type(page.locator('input[name="title"]'), 'Week 1 vocabulary quiz');
      await d.fill(page.locator('input[name="time_limit_min"]'), '10');
      await d.click(page.getByRole('button', { name: /Create quiz/ }));
      await d.until(() => page.waitForURL(/\/teach\/quizzes\/[0-9a-f-]{36}$/, { timeout: 60_000 }));
      await page.waitForLoadState('networkidle');

      d.step('Multiple choice', 'Tick the right answer, marked automatically', { say: 'Add multiple-choice questions and tick the right answer. These are marked automatically.' });
      let q = page.locator('aside form', { has: page.locator('textarea[name="prompt"]') });
      await d.type(q.locator('textarea[name="prompt"]'), 'What does كِتَاب (kitab) mean?');
      const o = q.locator('input[name="option"]');
      await d.until(async () => { await o.nth(0).fill('Pen'); await o.nth(1).fill('Book'); await o.nth(2).fill('Door'); await o.nth(3).fill('House'); });
      await d.check(q.locator('input[name="correct"]').nth(1));
      await d.click(q.getByRole('button', { name: 'Add question' }));
      await saved(page, d, q.locator('.ad-alert'));
      await d.until(() => page.waitForTimeout(1200));

      d.step('Short answer', 'Marked by the teacher', { say: 'Short answers are marked by the teacher, with a model answer to help.' });
      q = page.locator('aside form', { has: page.locator('textarea[name="prompt"]') });
      await d.click(q.locator('.lm-seg label', { hasText: 'Short answer' }));
      await d.type(q.locator('textarea[name="prompt"]'), 'Translate: Bismillah ir-Rahman ir-Raheem');
      await d.fill(q.locator('input[name="points"]'), '3');
      await d.type(q.locator('textarea[name="model_answer"]'), 'In the name of Allah, the Most Gracious, the Most Merciful');
      await d.click(q.getByRole('button', { name: 'Add question' }));
      await saved(page, d, q.locator('.ad-alert'));
      await d.until(() => page.reload({ waitUntil: 'networkidle' }));

      d.step('Publish', 'Students are emailed', { say: 'Publish it when it’s ready, and the students are emailed.' });
      await d.point(page.locator('.lm-qs'));
      await d.click(page.getByRole('button', { name: /Publish quiz/ }));
      await saved(page, d);
      await d.wait(1000);
    },
  },
  {
    title: 'My classes', sub: 'Student',
    async run(c) {
      const { page, d, BASE } = c;
      await as('student', c);
      await d.goto(`${BASE}/learn`);
      d.step('My classes', 'Announcements, what’s due, today’s classes', { say: 'Students see everything for their section in one place: announcements, what’s due, and today’s classes.', wide: true });
      await d.point(page.locator('.lm-notice').first());
      await d.point(page.locator('.lm-grid .ad-card').first());
      await d.wait(1200);
      await d.click(page.locator('.lm-nav a', { hasText: 'Materials' }), { nav: true });
      d.step('Materials', 'Grouped by week, open or download', { say: 'Materials are grouped by week, ready to open or download.' });
      await d.point(page.locator('.lm-attach__item').first());
      await d.wait(1400);
      await d.click(page.locator('.lm-nav a', { hasText: 'Timetable' }), { nav: true });
      d.step('Timetable', 'Their own week', { say: 'And here’s their weekly timetable.', wide: true });
      await d.point(page.locator('.lm-week__day').first());
      await d.wait(1400);
    },
  },
  {
    title: 'Hand in work', sub: 'Student',
    async run(c) {
      const { page, d } = c;
      await as('student', c);
      await d.click(page.locator('.lm-nav a', { hasText: 'Assignments' }), { nav: true });
      await d.click(page.locator('.lm-list a', { hasText: 'Translate Surah Al-Asr' }).first(), { nav: true });
      d.step('Hand in', 'Type an answer, attach a photo or file', { say: 'To hand in, type an answer or attach a photo or a file, then press Hand in.' });
      await d.type(page.locator('textarea[name="body"]'), 'By time, indeed mankind is in loss, except those who believe and do good. My full translation is attached.');
      await d.upload(page.locator('.lm-drop input[type="file"]'), HOMEWORK);
      await d.until(() => page.locator('.lm-files li').first().waitFor({ timeout: 60_000 }));
      await d.click(page.getByRole('button', { name: 'Hand in' }));
      await saved(page, d);
      d.step('Handed in', 'Can be changed until it’s marked', { say: 'They can still change it until the teacher marks it.' });
      await d.wait(1600);
    },
  },
  {
    title: 'Take a quiz', sub: 'Student',
    async run(c) {
      const { page, d } = c;
      await as('student', c);
      await d.click(page.locator('.lm-nav a', { hasText: 'Quizzes' }), { nav: true });
      await d.click(page.locator('.lm-list a', { hasText: 'Week 1 vocabulary quiz' }).first(), { nav: true });
      d.step('Before starting', 'The timer starts on Start', { say: 'Quizzes show the rules first. The timer only starts when they press Start.' });
      await d.point(page.locator('.lm-facts'));
      await d.click(page.getByRole('button', { name: 'Start quiz' }), { nav: true });
      d.step('Answer', 'Answers save as they go', { say: 'Answers save as they go, so nothing is lost if the page closes.' });
      await d.click(page.locator('.lq-opt', { hasText: 'Book' }));
      await d.click(page.getByRole('button', { name: 'Next' }));
      await d.type(page.locator('.lq-text'), 'In the name of Allah, the Most Merciful, the Most Kind');
      await d.wait(900);
      await d.click(page.getByRole('button', { name: 'Finish' }));
      d.step('Hand it in', 'Multiple choice is marked straight away', { say: 'Then hand it in. The multiple-choice part is marked straight away.' });
      await d.click(page.getByRole('button', { name: 'Hand in' }));
      await d.until(() => page.waitForURL(/done=1/, { timeout: 60_000 }));
      await page.waitForLoadState('networkidle');
      await d.point(page.locator('.lm-result'));
      await d.wait(1500);
    },
  },
  {
    title: 'Mark and give feedback', sub: 'Teacher',
    async run(c) {
      const { page, d, BASE } = c;
      await as('teacher', c);
      await d.goto(`${BASE}/teach`);
      d.step('To mark', 'Everything waiting, in one list', { say: 'Back on the Teaching page, anything waiting to be marked is listed.', wide: true });
      await d.point(page.locator('.lm-grid .ad-card').first());
      await d.click(page.locator('.lm-grid .ad-card').first().locator('a', { hasText: 'Translate Surah Al-Asr' }), { nav: true });
      d.step('Mark the work', 'Marks and a comment', { say: 'Open the work, give marks and a comment, and save.' });
      const m = page.locator('.lm-subrow', { hasText: STUDENT }).locator('form.lm-mark');
      await d.point(page.locator('.lm-subrow', { hasText: STUDENT }).locator('.lm-attach__item').first());
      await d.fill(m.locator('input[name="marks"]'), '9');
      await d.type(m.locator('textarea[name="feedback"]'), 'Excellent, MashaAllah. Watch the tense in ayah 2.');
      await d.click(m.getByRole('button', { name: 'Save' }));
      await saved(page, d, m.locator('.lm-ok, .lm-err'));
      await d.wait(900);

      await d.click(page.locator('.lm-nav a', { hasText: 'Quizzes' }), { nav: true });
      await d.click(page.locator('tbody a', { hasText: 'Week 1 vocabulary quiz' }).first(), { nav: true });
      await d.until(() => page.waitForURL(/\/teach\/quizzes\/[0-9a-f-]{36}/, { timeout: 30_000 }));
      await d.click(page.locator('.ad-tabs a', { hasText: 'Results' }), { nav: true });
      await d.until(() => page.waitForURL(/tab=results/, { timeout: 30_000 }).then(() => page.locator('tbody tr', { hasText: STUDENT }).waitFor({ timeout: 30_000 })));
      d.step('Quiz marking', 'Only the short answers need you', { say: 'For quizzes, only the short answers need the teacher.' });
      await d.click(page.locator('tbody tr', { hasText: STUDENT }).locator('a', { hasText: 'Mark' }), { nav: true });
      await d.point(page.locator('.lm-answer').first());
      await d.fill(page.locator('input[name^="pts_"]').last(), '3');
      await d.click(page.getByRole('button', { name: 'Save marks' }));
      await saved(page, d);
      await d.wait(900);
    },
  },
  {
    title: 'Results', sub: 'Student',
    async run(c) {
      const { page, d, BASE } = c;
      await as('student', c);
      await d.goto(`${BASE}/learn/results`);
      d.step('Results', 'Every mark and comment', { say: 'Students see every mark on their Results page. Attendance and exam results will join them here.', wide: true });
      await d.point(page.locator('.lm-stats'));
      await d.point(page.locator('tbody tr').first());
      await d.wait(1500);
      await d.click(page.locator('tbody tr a', { hasText: 'Translate Surah Al-Asr' }), { nav: true });
      d.step('Feedback', 'Straight from the teacher', { say: 'And the teacher’s comment is right there with the marks.' });
      await d.point(page.locator('.lm-result'));
      await d.wait(1800);
    },
  },
];
