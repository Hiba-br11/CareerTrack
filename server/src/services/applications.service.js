import prisma from '../config/prisma.js';
import { HttpError } from '../utils/httpError.js';

const withCompany = { company: { select: { id: true, name: true } } };

// Whitelist: the client chooses a key, never a raw column name
const ORDER_BY = {
  date_desc: { applicationDate: 'desc' },
  date_asc: { applicationDate: 'asc' },
  company_asc: { company: { name: 'asc' } },
  company_desc: { company: { name: 'desc' } },
};

// A company id must belong to the logged-in user
async function assertCompanyOwned(companyId, userId) {
  const company = await prisma.company.findFirst({
    where: { id: companyId, userId },
    select: { id: true },
  });
  if (!company) throw new HttpError(400, 'Entreprise introuvable');
}

export async function listApplications(userId, q) {
  const where = { userId }; // always scoped to the owner

  if (q.status) where.status = q.status;
  if (q.type) where.applicationType = q.type;
  if (q.from || q.to) {
    where.applicationDate = {};
    if (q.from) where.applicationDate.gte = q.from;
    if (q.to) where.applicationDate.lte = q.to;
  }
  if (q.search) {
    where.OR = [
      { jobTitle: { contains: q.search, mode: 'insensitive' } },
      { company: { name: { contains: q.search, mode: 'insensitive' } } },
    ];
  }

  // id as a tie-breaker keeps pagination stable when sort values are equal
  const orderBy = [ORDER_BY[q.sort], { id: 'desc' }];

  const [total, data] = await prisma.$transaction([
    prisma.application.count({ where }),
    prisma.application.findMany({
      where,
      orderBy,
      skip: (q.page - 1) * q.limit,
      take: q.limit,
      include: withCompany,
    }),
  ]);

  return { data, total, page: q.page, limit: q.limit, totalPages: Math.ceil(total / q.limit) };
}

export async function getApplication(userId, id) {
  const application = await prisma.application.findFirst({
    where: { id, userId },
    include: {
      company: true,
      history: { orderBy: { changedAt: 'asc' } }, // timeline of the detail page
    },
  });
  // 404 (not 403): do not reveal that this id exists for someone else
  if (!application) throw new HttpError(404, 'Candidature introuvable');
  return application;
}

export async function createApplication(userId, data) {
  await assertCompanyOwned(data.companyId, userId);

  // userId comes after the spread so the request body can never override it.
  // The nested create is part of the same transaction as the application itself.
  return prisma.application.create({
    data: {
      ...data,
      userId,
      history: { create: { oldStatus: null, newStatus: data.status ?? 'TO_APPLY' } },
    },
    include: withCompany,
  });
}

export async function updateApplication(userId, id, data) {
  const existing = await prisma.application.findFirst({ where: { id, userId } });
  if (!existing) throw new HttpError(404, 'Candidature introuvable');

  if (data.companyId !== undefined) await assertCompanyOwned(data.companyId, userId);

  const statusChanged = data.status !== undefined && data.status !== existing.status;

  // Update and history entry are written atomically (nested write = one transaction)
  return prisma.application.update({
    where: { id },
    data: {
      ...data,
      ...(statusChanged && {
        history: { create: { oldStatus: existing.status, newStatus: data.status } },
      }),
    },
    include: withCompany,
  });
}

export async function deleteApplication(userId, id) {
  // One query: delete only if it belongs to the user. History is removed by ON DELETE CASCADE.
  const { count } = await prisma.application.deleteMany({ where: { id, userId } });
  if (count === 0) throw new HttpError(404, 'Candidature introuvable');
}