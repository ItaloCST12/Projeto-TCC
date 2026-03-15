const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

prisma.produto
  .findMany({ where: { excluido: false } })
  .then((r) => console.log(JSON.stringify(r, null, 2)))
  .finally(() => prisma.$disconnect());
