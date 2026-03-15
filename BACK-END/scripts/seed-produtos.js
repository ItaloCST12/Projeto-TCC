const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const produtos = [
  { nome: "Limão", preco: 0, disponivel: true },
  { nome: "Laranja", preco: 0, disponivel: true },
  { nome: "Abacaxi", preco: 0, disponivel: true },
  { nome: "Tangerina", preco: 0, disponivel: true },
];

async function main() {
  for (const produto of produtos) {
    const existe = await prisma.produto.findFirst({
      where: { nome: produto.nome, excluido: false },
    });
    if (!existe) {
      await prisma.produto.create({ data: produto });
      console.log(`✅ Produto criado: ${produto.nome}`);
    } else {
      console.log(`⏭️  Produto já existe: ${produto.nome}`);
    }
  }
}

main()
  .catch((e) => {
    console.error("❌ Erro ao criar produtos:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
