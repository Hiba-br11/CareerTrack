// Unit tests: no database needed.  Run with:  npm run test:unit
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { HttpError } from '../src/utils/httpError.js';
import { cleanDisplayName, inspectUpload } from '../src/utils/fileValidation.js';

const pdf = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(50, 'x')]);
const docx = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from('....[Content_Types].xml....word/document.xml....')]);
const xlsxAsZip = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from('....xl/workbook.xml....')]);
const doc = Buffer.concat([Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]), Buffer.alloc(20)]);
const exe = Buffer.from('MZ\x90\x00 this is a windows executable');

const rejects = (buf, name) => assert.throws(() => inspectUpload(buf, name), (e) => e instanceof HttpError && e.status === 400);

describe('inspectUpload', () => {
  it('accepts a real PDF, DOCX and DOC', () => {
    assert.deepEqual(inspectUpload(pdf, 'cv.pdf'), { ext: '.pdf', mime: 'application/pdf' });
    assert.equal(inspectUpload(docx, 'lettre.docx').ext, '.docx');
    assert.equal(inspectUpload(doc, 'old.doc').mime, 'application/msword');
  });
  it('is case-insensitive on the extension', () => assert.equal(inspectUpload(pdf, 'CV.PDF').ext, '.pdf'));

  it('rejects extensions outside the allow-list', () => {
    for (const name of ['malware.exe', 'page.html', 'image.svg', 'script.js', 'archive.zip', 'cv', 'cv.pdf.exe', '.pdf.php'])
      rejects(pdf, name);
  });
  it('rejects content that does not match the extension', () => {
    rejects(exe, 'cv.pdf');           // executable disguised as a PDF
    rejects(pdf, 'cv.docx');          // PDF renamed to .docx
    rejects(docx, 'cv.pdf');
    rejects(xlsxAsZip, 'cv.docx');    // other zip-based format renamed to .docx
    rejects(Buffer.from('<script>alert(1)</script>'), 'cv.pdf');
  });
  it('rejects empty files', () => {
    rejects(Buffer.alloc(0), 'cv.pdf');
    rejects(undefined, 'cv.pdf');
  });
});

describe('cleanDisplayName', () => {
  it('strips folders (path traversal) and control characters', () => {
    assert.equal(cleanDisplayName('../../etc/passwd.pdf'), 'passwd.pdf');
    assert.equal(cleanDisplayName('C:\\Users\\me\\cv.pdf'), 'cv.pdf');
    assert.equal(cleanDisplayName('cv\u0000\u001f.pdf'), 'cv.pdf');
  });
  it('repairs UTF-8 names that multer decoded as latin1', () => {
    const mangled = Buffer.from('CV_Élève été.pdf', 'utf8').toString('latin1');
    assert.equal(cleanDisplayName(mangled), 'CV_Élève été.pdf');
    assert.equal(cleanDisplayName(Buffer.from('سيرة.pdf', 'utf8').toString('latin1')), 'سيرة.pdf');
  });
  it('leaves plain ASCII names alone', () => assert.equal(cleanDisplayName('Omar_CV.pdf'), 'Omar_CV.pdf'));
  it('truncates long names but keeps the extension', () => {
    const name = cleanDisplayName('a'.repeat(400) + '.pdf');
    assert.equal(name.length, 255);
    assert.ok(name.endsWith('.pdf'));
  });
  it('handles missing names', () => assert.equal(cleanDisplayName(undefined), ''));
});
