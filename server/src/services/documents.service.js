import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import prisma from '../config/prisma.js';
import { MAX_DOCUMENTS_PER_USER, UPLOAD_DIR } from '../config/uploads.js';
import { HttpError } from '../utils/httpError.js';
import { cleanDisplayName, inspectUpload } from '../utils/fileValidation.js';

// What the API may expose. storageKey (the name on disk) is deliberately NOT in this list.
export const publicDocumentSelect = {
  id: true,
  applicationId: true,
  fileName: true,
  fileType: true,
  mimeType: true,
  sizeBytes: true,
  uploadedAt: true,
  application: { select: { id: true, jobTitle: true } },
};

// Absolute path of a stored file; refuses anything that would leave the upload folder
function storagePath(storageKey) {
  const full = path.resolve(UPLOAD_DIR, storageKey);
  if (path.dirname(full) !== UPLOAD_DIR) throw new Error('Invalid storage key');
  return full;
}

async function assertApplicationOwned(applicationId, userId) {
  const application = await prisma.application.findFirst({
    where: { id: applicationId, userId },
    select: { id: true },
  });
  if (!application) throw new HttpError(400, 'Candidature introuvable');
}

export async function uploadDocument(userId, { type, applicationId }, file) {
  if (!file) throw new HttpError(400, 'Fichier requis (champ « file »)');

  const fileName = cleanDisplayName(file.originalname);
  const { ext, mime } = inspectUpload(file.buffer, fileName); // type + content checks

  if (applicationId) await assertApplicationOwned(applicationId, userId);

  const count = await prisma.document.count({ where: { userId } });
  if (count >= MAX_DOCUMENTS_PER_USER) {
    throw new HttpError(400, `Limite de ${MAX_DOCUMENTS_PER_USER} documents atteinte : supprimez-en un d’abord`);
  }

  // The name on disk is random: the user's filename never reaches the file system
  const storageKey = `${crypto.randomUUID()}${ext}`;
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(storagePath(storageKey), file.buffer, { flag: 'wx' }); // wx: never overwrite

  try {
    return await prisma.document.create({
      data: {
        userId,
        applicationId: applicationId ?? null,
        fileName,
        fileType: type,
        mimeType: mime,
        sizeBytes: file.buffer.length,
        storageKey,
      },
      select: publicDocumentSelect,
    });
  } catch (err) {
    await fs.unlink(storagePath(storageKey)).catch(() => {}); // no orphan file if the insert fails
    throw err;
  }
}

export function listDocuments(userId, q) {
  return prisma.document.findMany({
    where: {
      userId, // always scoped to the owner
      ...(q.applicationId && { applicationId: q.applicationId }),
      ...(q.type && { fileType: q.type }),
    },
    orderBy: [{ uploadedAt: 'desc' }, { id: 'desc' }],
    select: publicDocumentSelect,
  });
}

// Returns what the controller needs to stream the file
export async function getDownload(userId, id) {
  const doc = await prisma.document.findFirst({ where: { id, userId } });
  if (!doc) throw new HttpError(404, 'Document introuvable'); // same answer for "not yours" and "does not exist"

  const fullPath = storagePath(doc.storageKey);
  try {
    await fs.access(fullPath);
  } catch {
    throw new HttpError(404, 'Fichier introuvable sur le serveur');
  }
  return { fullPath, fileName: doc.fileName, mimeType: doc.mimeType };
}

export async function deleteDocument(userId, id) {
  const doc = await prisma.document.findFirst({ where: { id, userId } });
  if (!doc) throw new HttpError(404, 'Document introuvable');

  // Database first: a row pointing to a missing file is worse than a leftover file
  const { count } = await prisma.document.deleteMany({ where: { id, userId } });
  if (count === 0) throw new HttpError(404, 'Document introuvable');

  try {
    await fs.unlink(storagePath(doc.storageKey));
  } catch (err) {
    if (err.code !== 'ENOENT') console.error('Could not delete file', doc.storageKey, err);
  }
}
