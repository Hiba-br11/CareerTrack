// Unit tests: no database needed.  Run with:  npm run test:unit
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createApplicationSchema as create,
  updateApplicationSchema as update,
  listQuerySchema as listQuery,
  idParamSchema as idParam,
} from '../src/validators/applications.validator.js';

const valid = { companyId: '3', jobTitle: '  PFE ML  ', applicationType: 'PFE', applicationDate: '2026-11-19' };

describe('create schema', () => {
  it('coerces, trims and turns blank optional fields into null', () => {
    const r = create.safeParse({ ...valid, offerUrl: '', notes: '', followUpDate: '' });
    assert.ok(r.success);
    assert.equal(r.data.companyId, 3);
    assert.equal(r.data.jobTitle, 'PFE ML');
    assert.equal(r.data.offerUrl, null);
    assert.equal(r.data.followUpDate, null);
    assert.ok(r.data.applicationDate instanceof Date);
  });

  it('does not invent a status (the database default applies)', () => {
    assert.equal(create.safeParse(valid).data.status, undefined);
  });

  it('strips unknown keys (mass assignment: userId, id)', () => {
    const r = create.safeParse({ ...valid, userId: 99, id: 5 });
    assert.ok(r.success);
    assert.equal('userId' in r.data, false);
    assert.equal('id' in r.data, false);
  });

  const invalid = {
    'title too short': { ...valid, jobTitle: 'x' },
    'unknown type': { ...valid, applicationType: 'NOPE' },
    'bad date': { ...valid, applicationDate: 'garbage' },
    'not a url': { ...valid, offerUrl: 'not a url' },
    'unknown status': { ...valid, status: 'DONE' },
    'negative company': { ...valid, companyId: '-1' },
    'non-numeric company': { ...valid, companyId: 'abc' },
    'missing required fields': { jobTitle: 'ok job' },
  };
  for (const [name, body] of Object.entries(invalid)) {
    it(`rejects: ${name}`, () => assert.equal(create.safeParse(body).success, false));
  }

  it('only accepts http(s) offer links (blocks javascript: XSS)', () => {
    for (const bad of ['javascript:alert(1)', 'data:text/html,x', 'ftp://x.com/a', 'mailto:a@b.c']) {
      assert.equal(create.safeParse({ ...valid, offerUrl: bad }).success, false, bad);
    }
    for (const good of ['https://example.com/job?id=1', 'http://example.com']) {
      assert.equal(create.safeParse({ ...valid, offerUrl: good }).success, true, good);
    }
  });
});

describe('update schema', () => {
  it('is partial and never resets the status', () => {
    assert.deepEqual(Object.keys(update.safeParse({ notes: 'called' }).data), ['notes']);
    assert.deepEqual(update.safeParse({ status: 'INTERVIEW' }).data, { status: 'INTERVIEW' });
  });
  it('rejects an empty body', () => assert.equal(update.safeParse({}).success, false));
  it('does not allow nulling a required field', () => {
    assert.equal(update.safeParse({ jobTitle: null }).success, false);
  });
  it('allows clearing an optional field', () => {
    const r = update.safeParse({ followUpDate: null });
    assert.ok(r.success);
    assert.equal(r.data.followUpDate, null);
  });
});

describe('list query schema', () => {
  it('applies defaults', () => {
    const r = listQuery.safeParse({});
    assert.deepEqual([r.data.sort, r.data.page, r.data.limit], ['date_desc', 1, 10]);
  });
  it('treats blank values as absent', () => {
    const r = listQuery.safeParse({ status: '', search: '', page: '', limit: '' });
    assert.ok(r.success);
    assert.equal(r.data.status, undefined);
    assert.equal(r.data.page, 1);
  });
  it('coerces numbers', () => {
    assert.equal(listQuery.safeParse({ page: '3', limit: '20' }).data.page, 3);
  });
  const invalid = { 'limit too big': { limit: '500' }, 'page 0': { page: '0' }, 'sort not whitelisted': { sort: 'password' },
    'unknown status': { status: 'x' }, 'bad date': { from: 'zzz' } };
  for (const [name, q] of Object.entries(invalid)) {
    it(`rejects: ${name}`, () => assert.equal(listQuery.safeParse(q).success, false));
  }
});

describe('id param schema', () => {
  it('accepts positive integers', () => assert.equal(idParam.safeParse({ id: '12' }).data.id, 12));
  for (const bad of ['0', 'abc', '1.5', '-3']) {
    it(`rejects "${bad}"`, () => assert.equal(idParam.safeParse({ id: bad }).success, false));
  }
});
