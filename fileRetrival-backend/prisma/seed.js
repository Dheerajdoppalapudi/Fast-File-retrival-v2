import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function hashPassword(password) {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

async function main() {
  console.log('Start seeding...');

  // Create admin user
  const adminPassword = await hashPassword('test2@123');
  const admin = await prisma.user.upsert({
    where: { username: 'test2' },
    update: {},
    create: {
      username: 'test2',
      email: 'test2@gmail.com',
      password: adminPassword,
      role: 'ADMIN',
    },
  });
  console.log(`Created admin user: ${admin.username}`);

  // Create editor user
  const editorPassword = await hashPassword('test3@123');
  const editor = await prisma.user.upsert({
    where: { username: 'test3' },
    update: {},
    create: {
      username: 'test3',
      email: 'test3@gmail.com',
      password: editorPassword,
      role: 'EDITOR',
    },
  });
  console.log(`Created editor user: ${editor.username}`);

  // Create viewer user
  const viewerPassword = await hashPassword('test4@123');
  const viewer = await prisma.user.upsert({
    where: { username: 'test4' },
    update: {},
    create: {
      username: 'test4',
      email: 'test4@gmail.com',
      password: viewerPassword,
      role: 'VIEWER', // Note: "user" was mentioned, but schema shows VIEWER as the role
    },
  });
  console.log(`Created viewer user: ${viewer.username}`);

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });