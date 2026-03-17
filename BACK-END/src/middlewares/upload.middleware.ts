import fs from "fs";
import path from "path";
import multer from "multer";

const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;

const uploadDir = path.resolve(process.cwd(), "public", "uploads", "produtos");

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeBaseName = path
      .basename(file.originalname, ext)
      .trim()
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .slice(0, 50);

    const fileName = `${Date.now()}-${safeBaseName || "produto"}${ext}`;
    cb(null, fileName);
  },
});

const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];

  if (!allowedMimeTypes.includes(file.mimetype)) {
    cb(new Error("Formato de imagem inválido. Use JPG, PNG ou WEBP."));
    return;
  }

  cb(null, true);
};

export const uploadProdutoImagem = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_SIZE },
  fileFilter,
});
