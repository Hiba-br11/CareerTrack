import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = [
    { email: 'dev@careertrack.local', firstName: 'Dev', lastName: 'One' },
    { email: 'other@careertrack.local', firstName: 'Other', lastName: 'User' },
  ];

  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, passwordHash: 'not-a-real-hash' }, 
    });
    const hasCompany = await prisma.company.count({ where: { userId: user.id } });
    if (!hasCompany) {
      await prisma.company.create({
        data: { userId: user.id, name: `Company of ${u.firstName}`, sector: 'Software' },
      });
    }
    console.log(`user id=${user.id} (${u.email})`);
  }
}

main().finally(() => prisma.$disconnect());