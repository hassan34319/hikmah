import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage();
const slide = (t, s, body) => `<section><small>QURANIC SCIENCES · QURANIC ARABIC · WEEK 1</small><h1>${t}</h1><h2>${s}</h2>${body}</section>`;
await p.setContent(`<style>@page{size:1280px 720px;margin:0}body{margin:0;font-family:Georgia,serif}section{width:1280px;height:720px;box-sizing:border-box;padding:80px 100px;background:linear-gradient(135deg,#0A1628,#163057);color:#fff;page-break-after:always;position:relative}small{letter-spacing:.2em;color:#6CB8F5;font:600 14px sans-serif}h1{font-size:64px;margin:30px 0 10px}h2{font-weight:400;color:#A9BCD6;font-size:28px;margin:0 0 40px}p,li{font-size:30px;line-height:1.6}.ar{font-size:56px;direction:rtl;text-align:right;color:#E2B44B}</style>
${slide('The Arabic noun', 'al-ism · Lesson 1', '<p>Every word in Arabic is a noun, a verb or a particle.</p><p class="ar">كِتَابٌ · بَابٌ · قَلَمٌ</p>')}
${slide('Signs of a noun', 'How to recognise al-ism', '<ul><li>It can take <b>al-</b> (the)</li><li>It can take tanween (-un, -an, -in)</li><li>It can follow a preposition</li></ul>')}
${slide('Practice', 'Find the nouns', '<p class="ar">وَالْعَصْرِ إِنَّ الْإِنسَانَ لَفِي خُسْرٍ</p><p>Underline every noun in Surah Al-Asr, ayah 1 and 2.</p>')}`);
await p.pdf({ path: 'out/assets/Lesson 1 - The Arabic noun.pdf', width: '1280px', height: '720px', printBackground: true });
await p.setContent(`<style>body{font-family:'Comic Sans MS',cursive;padding:60px;background:#fffdf5;font-size:22px;line-height:2}h1{font-size:28px}</style><h1>Surah Al-Asr: translation</h1><p>Ayesha Noor · Weekdays</p><p>1. By time,</p><p>2. indeed mankind is in loss,</p><p>3. except those who believe, do good deeds, and urge one another to the truth and to patience.</p><p><b>Lesson:</b> time is the one thing we can't get back, so spend it on what lasts.</p>`);
await p.pdf({ path: 'out/assets/Ayesha Noor - Surah Al-Asr.pdf', format: 'A4', printBackground: true });
await b.close(); console.log('ok');
