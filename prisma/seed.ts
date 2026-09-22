import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Crea (o actualiza la contraseña de) el usuario ADMIN.
 * No existe endpoint público para registrar admins a propósito —
 * este rol se crea solo desde el servidor, corriendo este script.
 *
 * Uso: ADMIN_EMAIL=admin@pickcrane.com ADMIN_PASSWORD=algo-seguro npx tsx prisma/seed.ts
 * (o simplemente `npx prisma db seed` usando los valores por defecto de abajo)
 */
async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@pickcrane.com';
  const password = process.env.ADMIN_PASSWORD || 'admin123456';
  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.usuario.upsert({
    where: { email },
    update: { password: passwordHash },
    create: {
      email,
      password: passwordHash,
      nombre: 'Administrador PickCrane',
      rol: 'ADMIN',
    },
  });

  console.log(`Usuario ADMIN listo: ${admin.email}`);
  if (!process.env.ADMIN_PASSWORD) {
    console.log(`Contraseña por defecto: ${password} (cámbiala luego, o define ADMIN_PASSWORD en .env antes de correr el seed)`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
