import * as service from '../services/applications.service.js';

// Controllers only translate HTTP <-> service calls.
// Express 5 forwards rejected promises to the error handler automatically.

export async function list(req, res) {
  res.json(await service.listApplications(req.user.id, req.valid.query));
}

export async function getOne(req, res) {
  res.json(await service.getApplication(req.user.id, req.valid.params.id));
}

export async function create(req, res) {
  const application = await service.createApplication(req.user.id, req.valid.body);
  res.status(201).json(application);
}

export async function update(req, res) {
  res.json(await service.updateApplication(req.user.id, req.valid.params.id, req.valid.body));
}

export async function remove(req, res) {
  await service.deleteApplication(req.user.id, req.valid.params.id);
  res.status(204).send();
}