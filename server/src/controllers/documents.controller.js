import * as service from '../services/documents.service.js';

export async function upload(req, res) {
  const document = await service.uploadDocument(req.user.id, req.valid.body, req.file);
  res.status(201).json(document);
}

export async function list(req, res) {
  res.json(await service.listDocuments(req.user.id, req.valid.query));
}

export async function download(req, res) {
  const { fullPath, fileName, mimeType } = await service.getDownload(req.user.id, req.valid.params.id);
  res.setHeader('Content-Type', mimeType);
  res.setHeader('X-Content-Type-Options', 'nosniff'); // the browser must not guess another type
  res.setHeader('Cache-Control', 'private, no-store'); // personal documents: no shared caches
  res.download(fullPath, fileName); // Content-Disposition: attachment (never rendered in the page)
}

export async function remove(req, res) {
  await service.deleteDocument(req.user.id, req.valid.params.id);
  res.status(204).send();
}
