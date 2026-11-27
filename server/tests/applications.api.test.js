// Integration tests: real Express app + real PostgreSQL.  Run with:  npm run test:api
// They create their own users (@careertrack.test) and delete them at the end
// (ON DELETE CASCADE removes their companies, applications and history).
// While devAuth is in place, the acting user is chosen with DEV_USER_ID.
// After the real login exists, change only the `call` helper below.
import 'dotenv/config';
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';

const stamp = Date.now();
let server, base;
let userA, userB, alpha, zeta, otherCorp;

async function call(method, path, { user = userA, body, rawBody } = {}) {
  process.env.DEV_USER_ID = String(user.id);
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: rawBody ?? (body ? JSON.stringify(body) : undefined),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

const payload = (over = {}) => ({
  companyId: alpha.id,
  jobTitle: 'PFE Computer Vision',
  applicationType: 'PFE',
  applicationDate: '2026-11-19',
  ...over,
});

const ids = (res) => res.body.data.map((a) => a.id);

before(async () => {
  const mkUser = (tag) =>
    prisma.user.create({
      data: { email: `${tag}-${stamp}@careertrack.test`, firstName: tag, lastName: 'Test', passwordHash: 'x' },
    });
  userA = await mkUser('a');
  userB = await mkUser('b');
  alpha = await prisma.company.create({ data: { userId: userA.id, name: 'Alpha Systems' } });
  zeta = await prisma.company.create({ data: { userId: userA.id, name: 'Zeta Labs' } });
  otherCorp = await prisma.company.create({ data: { userId: userB.id, name: 'Other Corp' } });
  server = app.listen(0);
  base = `http://localhost:${server.address().port}/api`;
});

after(async () => {
  server.close();
  await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } });
  await prisma.$disconnect();
});

describe('create', () => {
  it('creates an application (201) with a first history entry', async () => {
    const res = await call('POST', '/applications', { body: payload() });
    assert.equal(res.status, 201);
    assert.equal(res.body.status, 'TO_APPLY');
    assert.equal(res.body.userId, userA.id);
    const history = await prisma.applicationHistory.findMany({ where: { applicationId: res.body.id } });
    assert.equal(history.length, 1);
    assert.equal(history[0].oldStatus, null);
    assert.equal(history[0].newStatus, 'TO_APPLY');
  });

  it('ignores a userId sent in the body (mass assignment)', async () => {
    const res = await call('POST', '/applications', { body: { ...payload(), userId: userB.id } });
    assert.equal(res.status, 201);
    assert.equal(res.body.userId, userA.id);
  });

  it('records the chosen initial status in the history', async () => {
    const res = await call('POST', '/applications', { body: payload({ status: 'APPLIED' }) });
    const [h] = await prisma.applicationHistory.findMany({ where: { applicationId: res.body.id } });
    assert.equal(h.newStatus, 'APPLIED');
  });

  it('rejects invalid input with field errors (400)', async () => {
    const res = await call('POST', '/applications', { body: payload({ jobTitle: 'x' }) });
    assert.equal(res.status, 400);
    assert.equal(res.body.errors[0].field, 'jobTitle');
  });

  it("rejects another user's company (400)", async () => {
    const res = await call('POST', '/applications', { body: payload({ companyId: otherCorp.id }) });
    assert.equal(res.status, 400);
  });

  it('rejects a company that does not exist (400)', async () => {
    const res = await call('POST', '/applications', { body: payload({ companyId: 999999999 }) });
    assert.equal(res.status, 400);
  });

  it('rejects malformed JSON (400)', async () => {
    const res = await call('POST', '/applications', { rawBody: '{bad json' });
    assert.equal(res.status, 400);
    assert.equal(res.body.message, 'JSON invalide');
  });
});

describe('read, update and history', () => {
  let id;
  before(async () => {
    id = (await call('POST', '/applications', { body: payload({ jobTitle: 'History Test' }) })).body.id;
  });

  it('returns the detail with company and ordered history', async () => {
    const res = await call('GET', `/applications/${id}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.company.name, 'Alpha Systems');
    assert.equal(res.body.history.length, 1);
  });

  it('updating a non-status field does not add history', async () => {
    const res = await call('PATCH', `/applications/${id}`, { body: { notes: 'sent by mail' } });
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'TO_APPLY');
    assert.equal((await call('GET', `/applications/${id}`)).body.history.length, 1);
  });

  it('sending the same status adds no history', async () => {
    await call('PATCH', `/applications/${id}`, { body: { status: 'TO_APPLY' } });
    assert.equal((await call('GET', `/applications/${id}`)).body.history.length, 1);
  });

  it('each status change adds one entry, in order', async () => {
    await call('PATCH', `/applications/${id}`, { body: { status: 'APPLIED' } });
    await call('PATCH', `/applications/${id}`, { body: { status: 'INTERVIEW', notes: 'Monday 10am' } });
    const { body } = await call('GET', `/applications/${id}`);
    assert.deepEqual(body.history.map((h) => [h.oldStatus, h.newStatus]), [
      [null, 'TO_APPLY'],
      ['TO_APPLY', 'APPLIED'],
      ['APPLIED', 'INTERVIEW'],
    ]);
    assert.equal(body.notes, 'Monday 10am');
  });

  it('can clear an optional field with null / blank', async () => {
    await call('PATCH', `/applications/${id}`, { body: { followUpDate: '2026-12-01' } });
    const res = await call('PATCH', `/applications/${id}`, { body: { followUpDate: '' } });
    assert.equal(res.body.followUpDate, null);
  });

  it('rejects an empty body, a bad status and a foreign company (400)', async () => {
    assert.equal((await call('PATCH', `/applications/${id}`, { body: {} })).status, 400);
    assert.equal((await call('PATCH', `/applications/${id}`, { body: { status: 'WIN' } })).status, 400);
    assert.equal((await call('PATCH', `/applications/${id}`, { body: { companyId: otherCorp.id } })).status, 400);
  });

  it('returns 404 for unknown ids and 400 for malformed ids', async () => {
    assert.equal((await call('GET', '/applications/999999999')).status, 404);
    assert.equal((await call('GET', '/applications/abc')).status, 400);
  });
});

describe('ownership: user B cannot touch user A data', () => {
  let id;
  before(async () => {
    id = (await call('POST', '/applications', { body: payload({ jobTitle: 'Private Job' }) })).body.id;
  });

  it('GET, PATCH and DELETE on someone else\'s application all return 404', async () => {
    assert.equal((await call('GET', `/applications/${id}`, { user: userB })).status, 404);
    assert.equal((await call('PATCH', `/applications/${id}`, { user: userB, body: { notes: 'hacked' } })).status, 404);
    assert.equal((await call('DELETE', `/applications/${id}`, { user: userB })).status, 404);
  });

  it('the data is untouched afterwards', async () => {
    const row = await prisma.application.findUnique({ where: { id } });
    assert.ok(row);
    assert.equal(row.notes, null);
  });

  it("user B's list does not contain user A's applications", async () => {
    const res = await call('GET', '/applications', { user: userB });
    assert.equal(res.body.total, 0);
  });
});

describe('list: search, filters, sort, pagination', () => {
  const a = {}; // label -> id
  before(async () => {
    // start from a clean slate for user A so counts are exact
    await prisma.application.deleteMany({ where: { userId: userA.id } });
    const make = async (label, company, jobTitle, applicationType, applicationDate, status) => {
      const res = await call('POST', '/applications', { body: { companyId: company.id, jobTitle, applicationType, applicationDate, status } });
      a[label] = res.body.id;
    };
    await make('a1', alpha, 'Data Engineer PFE', 'PFE', '2026-01-10');
    await make('a2', alpha, 'Frontend Developer', 'EMPLOYMENT', '2026-02-15', 'APPLIED');
    await make('a3', zeta, 'ML Intern', 'SUMMER_INTERNSHIP', '2026-03-20', 'INTERVIEW');
    await make('a4', zeta, 'Data Analyst', 'EMPLOYMENT', '2026-04-05', 'REJECTED');
    await make('a5', alpha, 'DevOps PFE', 'PFE', '2026-05-30', 'ACCEPTED');
  });

  const sorted = (xs) => [...xs].sort((x, y) => x - y);
  const want = (...labels) => sorted(labels.map((l) => a[l]));

  it('returns everything with the pagination envelope', async () => {
    const res = await call('GET', '/applications');
    assert.equal(res.body.total, 5);
    assert.deepEqual(Object.keys(res.body).sort(), ['data', 'limit', 'page', 'total', 'totalPages']);
    assert.equal(res.body.data[0].company.name !== undefined, true);
  });

  it('filters by status and by type', async () => {
    assert.deepEqual(ids(await call('GET', '/applications?status=APPLIED')), [a.a2]);
    assert.deepEqual(sorted(ids(await call('GET', '/applications?type=PFE'))), want('a1', 'a5'));
  });

  it('searches company name and job title, case-insensitively', async () => {
    assert.deepEqual(sorted(ids(await call('GET', '/applications?search=zeta'))), want('a3', 'a4'));
    assert.deepEqual(sorted(ids(await call('GET', '/applications?search=DATA'))), want('a1', 'a4'));
    assert.deepEqual(sorted(ids(await call('GET', '/applications?search=alpha'))), want('a1', 'a2', 'a5'));
    assert.equal((await call('GET', '/applications?search=nothing-matches')).body.total, 0);
  });

  it('filters by date range, inclusive on both ends', async () => {
    assert.deepEqual(sorted(ids(await call('GET', '/applications?from=2026-03-01&to=2026-04-30'))), want('a3', 'a4'));
    assert.deepEqual(ids(await call('GET', '/applications?from=2026-03-20&to=2026-03-20')), [a.a3]);
    assert.deepEqual(sorted(ids(await call('GET', '/applications?from=2026-05-01'))), want('a5'));
  });

  it('combines filters', async () => {
    const res = await call('GET', '/applications?type=EMPLOYMENT&search=analyst&status=REJECTED');
    assert.deepEqual(ids(res), [a.a4]);
  });

  it('sorts by date and by company', async () => {
    assert.deepEqual(ids(await call('GET', '/applications?sort=date_asc')), [a.a1, a.a2, a.a3, a.a4, a.a5]);
    assert.deepEqual(ids(await call('GET', '/applications?sort=date_desc')), [a.a5, a.a4, a.a3, a.a2, a.a1]);
    // ties on company are broken by id desc
    assert.deepEqual(ids(await call('GET', '/applications?sort=company_asc')), [a.a5, a.a2, a.a1, a.a4, a.a3]);
    assert.deepEqual(ids(await call('GET', '/applications?sort=company_desc')), [a.a4, a.a3, a.a5, a.a2, a.a1]);
  });

  it('paginates without gaps or duplicates', async () => {
    const pages = [];
    for (const p of [1, 2, 3]) pages.push(await call('GET', `/applications?limit=2&page=${p}&sort=date_asc`));
    assert.deepEqual(pages.map((r) => r.body.data.length), [2, 2, 1]);
    assert.ok(pages.every((r) => r.body.totalPages === 3 && r.body.total === 5));
    assert.deepEqual(pages.flatMap(ids), [a.a1, a.a2, a.a3, a.a4, a.a5]);
    assert.equal((await call('GET', '/applications?limit=2&page=4')).body.data.length, 0);
  });

  it('rejects bad query values (400)', async () => {
    for (const q of ['limit=500', 'page=0', 'sort=password', 'status=WIN', 'from=zzz']) {
      assert.equal((await call('GET', `/applications?${q}`)).status, 400, q);
    }
  });
});

describe('delete', () => {
  it('deletes (204), cascades the history, then 404', async () => {
    const id = (await call('POST', '/applications', { body: payload({ jobTitle: 'To Delete' }) })).body.id;
    await call('PATCH', `/applications/${id}`, { body: { status: 'APPLIED' } });
    assert.equal((await prisma.applicationHistory.count({ where: { applicationId: id } })), 2);

    assert.equal((await call('DELETE', `/applications/${id}`)).status, 204);
    assert.equal((await prisma.applicationHistory.count({ where: { applicationId: id } })), 0);
    assert.equal((await call('GET', `/applications/${id}`)).status, 404);
    assert.equal((await call('DELETE', `/applications/${id}`)).status, 404);
  });

  it('the database refuses to delete a company that still has applications (RESTRICT)', async () => {
    // user A still has applications on "Alpha Systems" from the list tests
    await assert.rejects(() => prisma.company.delete({ where: { id: alpha.id } }));
  });
});
