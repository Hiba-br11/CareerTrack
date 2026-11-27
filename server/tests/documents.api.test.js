// Integration tests: real Express app + real PostgreSQL + real files in a temporary folder.
// Run with:  npm run test:docs
// Users are created by the test and deleted at the end; uploaded files go to a temp dir, not ./uploads.
import 'dotenv/config';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';

// These must be set BEFORE the app is imported (config/uploads.js reads them at load time)
const uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'careertrack-uploads-'));
process.env.UPLOAD_DIR = uploadDir;
process.env.MAX_DOCUMENTS_PER_USER = '5';

const { default: app } = await import('../src/app.js');
const { default: prisma } = await import('../src/config/prisma.js');

const tag = `${Date.now()}-${process.pid}`;
let server, base;
let userA, userB, userC, appA;

const PDF = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.from('my cv content '.repeat(20))]);
const DOCX = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from('[Content_Types].xml word/document.xml')]);
const DOC = Buffer.concat([Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]), Buffer.alloc(40)]);
const EXE = Buffer.from('MZ\x90\x00 pretend this is an executable');

const filesOnDisk = () => fs.readdirSync(uploadDir);

async function upload(user, { name = 'cv.pdf', bytes = PDF, type = 'CV', applicationId, field = 'file', withFile = true } = {}) {
  process.env.DEV_USER_ID = String(user.id);
  const form = new FormData();
  if (withFile) form.append(field, new Blob([bytes], { type: 'application/octet-stream' }), name);
  if (type !== null) form.append('type', type); // null = leave the field out
  if (applicationId !== undefined) form.append('applicationId', String(applicationId));
  const res = await fetch(`${base}/documents`, { method: 'POST', body: form });
  return { status: res.status, body: await res.json() };
}

async function call(method, urlPath, user = userA) {
  process.env.DEV_USER_ID = String(user.id);
  const res = await fetch(base + urlPath, { method });
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { /* binary body */ }
  return { status: res.status, body, res };
}

before(async () => {
  const mkUser = (name) =>
    prisma.user.create({ data: { email: `${name}-${tag}@docs.careertrack.test`, firstName: name, lastName: 'Test', passwordHash: 'x' } });
  [userA, userB, userC] = await Promise.all([mkUser('a'), mkUser('b'), mkUser('c')]);
  const company = await prisma.company.create({ data: { userId: userA.id, name: 'Docs Corp' } });
  appA = await prisma.application.create({
    data: { userId: userA.id, companyId: company.id, jobTitle: 'Docs Test Job', applicationType: 'PFE', applicationDate: new Date('2026-11-19') },
  });
  server = app.listen(0);
  base = `http://localhost:${server.address().port}/api`;
});

after(async () => {
  server.close();
  await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id, userC.id] } } });
  await prisma.$disconnect();
  fs.rmSync(uploadDir, { recursive: true, force: true });
});

describe('upload: accepted files', () => {
  let first;
  it('stores a PDF: 201, public fields only, random name on disk, identical bytes', async () => {
    const res = await upload(userA, { name: 'cv.pdf', type: 'CV' });
    assert.equal(res.status, 201);
    first = res.body;
    assert.equal(first.fileName, 'cv.pdf');
    assert.equal(first.fileType, 'CV');
    assert.equal(first.mimeType, 'application/pdf');
    assert.equal(first.sizeBytes, PDF.length);
    assert.equal(first.applicationId, null);
    assert.equal('storageKey' in first, false, 'the name on disk must never be exposed');
    assert.equal('userId' in first, false);

    const files = filesOnDisk();
    assert.equal(files.length, 1);
    assert.match(files[0], /^[0-9a-f-]{36}\.pdf$/);          // uuid + extension, not "cv.pdf"
    assert.deepEqual(fs.readFileSync(path.join(uploadDir, files[0])), PDF);
  });

  it('keeps accents in the display name and attaches to an application', async () => {
    const res = await upload(userA, { name: 'CV_Élève été.pdf', type: 'COVER_LETTER', applicationId: appA.id });
    assert.equal(res.status, 201);
    assert.equal(res.body.fileName, 'CV_Élève été.pdf');
    assert.equal(res.body.applicationId, appA.id);
    assert.equal(res.body.application.jobTitle, 'Docs Test Job');
  });

  it('accepts .docx and .doc', async () => {
    assert.equal((await upload(userA, { name: 'lettre.docx', bytes: DOCX, type: 'COVER_LETTER' })).status, 201);
    assert.equal((await upload(userA, { name: 'old.doc', bytes: DOC, type: 'OTHER' })).status, 201);
  });

  it('a path-traversal filename never reaches the file system', async () => {
    const before = filesOnDisk().length;
    // user A already has 4 documents (max is 5 in this test): this is the 5th
    const res = await upload(userA, { name: '../../../etc/passwd.pdf' });
    assert.equal(res.status, 201);
    assert.equal(res.body.fileName, 'passwd.pdf');
    assert.equal(filesOnDisk().length, before + 1);
    for (const f of filesOnDisk()) assert.match(f, /^[0-9a-f-]{36}\.(pdf|docx|doc)$/);
  });
});

describe('upload: rejected files (nothing is written)', () => {
  const rejected = async (user, opts, status, messagePart) => {
    const before = filesOnDisk().length;
    const res = await upload(user, opts);
    assert.equal(res.status, status, JSON.stringify(res.body));
    if (messagePart) assert.match(res.body.message, messagePart);
    assert.equal(filesOnDisk().length, before, 'no file may be written on rejection');
  };

  it('extension outside the allow-list', async () => {
    await rejected(userB, { name: 'virus.exe', bytes: EXE }, 400, /non autorisé/);
    await rejected(userB, { name: 'page.html', bytes: Buffer.from('<script>1</script>') }, 400, /non autorisé/);
    await rejected(userB, { name: 'cv.pdf.exe', bytes: PDF }, 400, /non autorisé/);
  });
  it('content that does not match the extension (executable renamed .pdf)', async () => {
    await rejected(userB, { name: 'cv.pdf', bytes: EXE }, 400, /ne correspond pas/);
  });
  it('empty file', async () => {
    await rejected(userB, { name: 'cv.pdf', bytes: Buffer.alloc(0) }, 400, /vide/);
  });
  it('file larger than 5 MB -> 413', async () => {
    const big = Buffer.concat([Buffer.from('%PDF-'), Buffer.alloc(5 * 1024 * 1024)]);
    await rejected(userB, { name: 'big.pdf', bytes: big }, 413, /volumineux/);
  });
  it('no file at all', async () => {
    await rejected(userB, { withFile: false }, 400, /Fichier requis/);
  });
  it('wrong form field name', async () => {
    await rejected(userB, { field: 'document' }, 400);
  });
  it('missing or unknown document type', async () => {
    await rejected(userB, { type: null }, 400);
    await rejected(userB, { type: 'RESUME' }, 400);
  });
  it('application of another user, or that does not exist', async () => {
    await rejected(userB, { applicationId: appA.id }, 400, /Candidature introuvable/);
    await rejected(userB, { applicationId: 999999999 }, 400, /Candidature introuvable/);
  });
  it('per-user limit (5 documents in this test run)', async () => {
    for (let i = 0; i < 5; i++) assert.equal((await upload(userC, { name: `cv${i}.pdf` })).status, 201);
    await rejected(userC, { name: 'one-too-many.pdf' }, 400, /Limite/);
  });
});

describe('list', () => {
  it('returns only the caller\'s documents, newest first, with filters', async () => {
    const all = await call('GET', '/documents');
    assert.equal(all.status, 200);
    assert.equal(all.body.length, 5);
    assert.ok(all.body.every((d) => !('storageKey' in d)));

    assert.equal((await call('GET', `/documents?applicationId=${appA.id}`)).body.length, 1);
    assert.equal((await call('GET', '/documents?type=COVER_LETTER')).body.length, 2);
    assert.equal((await call('GET', '/documents?type=CV&applicationId=')).body.length, 2);
    assert.equal((await call('GET', '/documents?type=NOPE')).status, 400);
  });
  it('another user sees none of them', async () => {
    assert.equal((await call('GET', '/documents', userB)).body.length, 0);
  });
  it('the application detail includes its documents (public fields only)', async () => {
    const res = await call('GET', `/applications/${appA.id}`);
    assert.equal(res.body.documents.length, 1);
    assert.equal(res.body.documents[0].fileName, 'CV_Élève été.pdf');
    assert.equal('storageKey' in res.body.documents[0], false);
  });
});

describe('download', () => {
  let doc;
  before(async () => { doc = (await call('GET', '/documents?type=CV')).body[0]; });

  it('the owner gets the exact bytes, as an attachment, with safe headers', async () => {
    const { status, res } = await call('GET', `/documents/${doc.id}/download`);
    assert.equal(status, 200);
    assert.equal(res.headers.get('content-type'), 'application/pdf');
    assert.match(res.headers.get('content-disposition'), /^attachment/);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.match(res.headers.get('cache-control'), /no-store/);
  });
  it('another user gets 404, and so does an unknown id', async () => {
    assert.equal((await call('GET', `/documents/${doc.id}/download`, userB)).status, 404);
    assert.equal((await call('GET', '/documents/999999999/download')).status, 404);
    assert.equal((await call('GET', '/documents/abc/download')).status, 400);
  });
  it('the file is not reachable through any static path', async () => {
    const stored = filesOnDisk()[0];
    for (const p of [`/uploads/${stored}`, `/api/uploads/${stored}`, `/${stored}`]) {
      const res = await fetch(`http://localhost:${server.address().port}${p}`);
      assert.equal(res.status, 404, p);
    }
  });
});

describe('delete', () => {
  it('another user cannot delete it (404) and the file stays', async () => {
    const [target] = (await call('GET', '/documents?type=OTHER')).body;
    const before = filesOnDisk().length;
    assert.equal((await call('DELETE', `/documents/${target.id}`, userB)).status, 404);
    assert.equal(filesOnDisk().length, before);
    assert.equal(await prisma.document.count({ where: { id: target.id } }), 1);
  });
  it('the owner deletes it: 204, row and file are gone, then 404', async () => {
    const [target] = (await call('GET', '/documents?type=OTHER')).body;
    const row = await prisma.document.findUnique({ where: { id: target.id } });
    assert.ok(fs.existsSync(path.join(uploadDir, row.storageKey)));
    assert.equal((await call('DELETE', `/documents/${target.id}`)).status, 204);
    assert.equal(fs.existsSync(path.join(uploadDir, row.storageKey)), false);
    assert.equal(await prisma.document.count({ where: { id: target.id } }), 0);
    assert.equal((await call('DELETE', `/documents/${target.id}`)).status, 404);
  });
  it('a row whose file vanished from disk gives a clean 404 on download', async () => {
    const [target] = (await call('GET', '/documents?type=COVER_LETTER')).body;
    const row = await prisma.document.findUnique({ where: { id: target.id } });
    fs.unlinkSync(path.join(uploadDir, row.storageKey));
    const res = await call('GET', `/documents/${target.id}/download`);
    assert.equal(res.status, 404);
    assert.match(res.body.message, /Fichier introuvable/);
  });
});

describe('deleting an application keeps its documents', () => {
  it('the document stays in the library, detached (application_id = null)', async () => {
    const attached = (await call('GET', `/documents?applicationId=${appA.id}`)).body[0];
    assert.ok(attached);
    assert.equal((await call('DELETE', `/applications/${appA.id}`)).status, 204);
    const after = (await call('GET', '/documents')).body.find((d) => d.id === attached.id);
    assert.ok(after, 'document still listed');
    assert.equal(after.applicationId, null);
  });
});
