import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2] || "admin@example.com";
  const password = process.argv[3] || "admin123";
  const nome = process.argv[4] || "Administrador";

  try {
    // Verifica se o usuário já existe
    const usuarioExistente = await prisma.usuario.findUnique({
      where: { email },
    });

    if (usuarioExistente) {
      // Promove usuário existente para admin
      const admin = await prisma.usuario.update({
        where: { email },
        data: { role: "ADMIN" },
      });
      console.log("✅ Usuário promovido a ADMIN:", {
        id: admin.id,
        nome: admin.nome,
        email: admin.email,
        role: admin.role,
      });
    } else {
      // Cria novo admin
      const hashedPassword = await bcrypt.hash(password, 10);
      const admin = await prisma.usuario.create({
        data: {
          nome,
          email,
          password: hashedPassword,
          role: "ADMIN",
        },
      });
      console.log("✅ Admin criado com sucesso:", {
        id: admin.id,
        nome: admin.nome,
        email: admin.email,
        role: admin.role,
      });
    }
  } catch (error) {
    console.error("❌ Erro ao criar/promover admin:", error.message);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
