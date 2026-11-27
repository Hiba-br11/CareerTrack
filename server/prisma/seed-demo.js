// Demo data for the presentation: 8 companies and 24 applications for the dev user,
// with realistic status histories and follow-up dates (some overdue, some upcoming).
// Run after `npm run seed`:   npm run seed:demo
// Deterministic on purpose (no randomness): the demo looks the same on every machine.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const COMPANIES = [
  ['Vermeg', 'Finance software'], ['Sofrecom Tunisie', 'Telecom'], ['Instadeep', 'Artificial intelligence'],
  ['Focus Corporation', 'IT services'], ['Ooredoo', 'Telecom'], ['Talan', 'Consulting'],
  ['Proxym Group', 'Software'], ['Orange Business', 'Telecom'],
];
const JOBS = [
  ['PFE Computer Vision', 'PFE'], ['Full-stack Developer Intern', 'SUMMER_INTERNSHIP'], ['Data Engineer', 'EMPLOYMENT'],
  ['PFE NLP Assistant', 'PFE'], ['DevOps Engineer', 'EMPLOYMENT'], ['Stage Développement Web', 'SUMMER_INTERNSHIP'],
  ['ML Engineer', 'EMPLOYMENT'], ['PFE Cybersecurity', 'PFE'], ['Data Analyst Intern', 'SUMMER_INTERNSHIP'],
];
// Final status of each application; the history is built to reach it step by step
const FINAL = ['APPLIED', 'TO_APPLY', 'INTERVIEW', 'REJECTED', 'APPLIED', 'ACCEPTED', 'APPLIED', 'TO_APPLY',
               'INTERVIEW', 'APPLIED', 'REJECTED', 'APPLIED'];
const PATH = {
  TO_APPLY: [],
  APPLIED: ['APPLIED'],
  INTERVIEW: ['APPLIED', 'INTERVIEW'],
  ACCEPTED: ['APPLIED', 'INTERVIEW', 'ACCEPTED'],
  REJECTED: ['APPLIED', 'REJECTED'],
};

const DAY = 24 * 60 * 60 * 1000;
const dayStart = (offsetDays) => {
  const d = new Date(Date.now() - offsetDays * DAY);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'dev@careertrack.local' } });
  if (!user) throw new Error('Dev user not found: run `npm run seed` first.');

  if (await prisma.application.count({ where: { userId: user.id } })) {
    console.log('The dev user already has applications: nothing to do.');
    return;
  }

  const companies = [];
  for (const [name, sector] of COMPANIES) {
    companies.push(await prisma.company.create({ data: { userId: user.id, name, sector } }));
  }

  for (let i = 0; i < 24; i++) {
    const [jobTitle, applicationType] = JOBS[i % JOBS.length];
    const finalStatus = FINAL[i % FINAL.length];
    const applicationDate = dayStart(110 - i * 4); // from ~110 days ago to ~18 days ago
    const steps = PATH[finalStatus];

    // history: creation as TO_APPLY, then one entry per step, a few days apart
    const history = [{ oldStatus: null, newStatus: 'TO_APPLY', changedAt: applicationDate }];
    let previous = 'TO_APPLY';
    steps.forEach((status, s) => {
      history.push({
        oldStatus: previous,
        newStatus: status,
        changedAt: new Date(applicationDate.getTime() + (s + 1) * 3 * DAY),
      });
      previous = status;
    });

    await prisma.application.create({
      data: {
        userId: user.id,
        companyId: companies[i % companies.length].id,
        jobTitle,
        applicationType,
        applicationDate,
        status: finalStatus,
        offerUrl: `https://careers.example.com/jobs/${1000 + i}`,
        description: `Demo offer for "${jobTitle}".`,
        notes: i % 3 === 0 ? 'Sent my CV and a cover letter by email.' : null,
        // applied applications get a follow-up date: some overdue, one due today, some upcoming
        // (i = 18 is due today, smaller i are overdue, larger i are upcoming)
        followUpDate: finalStatus === 'APPLIED' ? dayStart(18 - i) : null,
        history: { create: history },
      },
    });
  }
  console.log('Demo data created: 8 companies, 24 applications.');
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
