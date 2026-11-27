import { HttpError } from './httpError.js';

// Allow-list. For each extension: the MIME type we store and the "magic bytes" the file must start with.
// The extension and MIME type sent by the browser are NOT trusted: the content decides.
const PDF = Buffer.from('%PDF-');
const ZIP = Buffer.from([0x50, 0x4b, 0x03, 0x04]); // .docx is a zip archive
const OLE = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]); // legacy .doc

const startsWith = (buf, magic) => buf.length >= magic.length && buf.subarray(0, magic.length).equals(magic);

const ALLOWED = {
  '.pdf': { mime: 'application/pdf', check: (b) => startsWith(b, PDF) },
  '.docx': {
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    // zip signature + a "word/" entry name (zip entry names are stored in clear text):
    // rejects other zip-based files (xlsx, jar...) renamed to .docx. It is a heuristic, not a full parse.
    check: (b) => startsWith(b, ZIP) && b.includes('word/'),
  },
  '.doc': { mime: 'application/msword', check: (b) => startsWith(b, OLE) },
};

export const ALLOWED_EXTENSIONS = Object.keys(ALLOWED);

// Returns the lowercase extension of the LAST dot ("cv.pdf.exe" -> ".exe"), or ''
function extensionOf(name) {
  const i = name.lastIndexOf('.');
  return i === -1 ? '' : name.slice(i).toLowerCase();
}

// Throws HttpError(400) unless the upload is an allowed type whose content matches its extension.
export function inspectUpload(buffer, displayName) {
  if (!buffer || buffer.length === 0) throw new HttpError(400, 'Le fichier est vide');
  const ext = extensionOf(displayName);
  const rule = ALLOWED[ext];
  if (!rule) {
    throw new HttpError(400, `Type de fichier non autorisé (formats acceptés : ${ALLOWED_EXTENSIONS.join(', ')})`);
  }
  if (!rule.check(buffer)) {
    throw new HttpError(400, 'Le contenu du fichier ne correspond pas à son extension');
  }
  return { ext, mime: rule.mime };
}

// multer decodes multipart filenames as latin1, so UTF-8 names ("Élève") arrive garbled.
// Undo that, but only when the result is valid UTF-8.
function fixEncoding(name) {
  const decoded = Buffer.from(name, 'latin1').toString('utf8');
  return decoded.includes('\uFFFD') ? name : decoded;
}

// The name is for DISPLAY only (never used as a path): strip folders and control characters.
export function cleanDisplayName(rawName) {
  let name = fixEncoding(String(rawName ?? ''));
  name = name.split(/[\\/]/).pop();            // drop any folder part ("../../x.pdf" -> "x.pdf")
  name = name.replace(/[\u0000-\u001f\u007f]/g, '').trim();
  if (name.length > 255) {
    const ext = extensionOf(name);
    name = name.slice(0, 255 - ext.length) + ext; // keep the extension when truncating
  }
  return name;
}
