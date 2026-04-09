import fs from "fs";
import path from "path";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;
const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];

const uploadDir = path.resolve(process.cwd(), "public", "uploads", "produtos");

const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
const cloudinaryFolder = process.env.CLOUDINARY_FOLDER?.trim() || "projeto-tcc/produtos";

const hasCloudinaryCredentials = Boolean(cloudName && apiKey && apiSecret);

if (hasCloudinaryCredentials) {
  cloudinary.config({
    cloud_name: cloudName!,
    api_key: apiKey!,
    api_secret: apiSecret!,
  });
}

const localStorage = multer.diskStorage({
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

const cloudinaryStorage = hasCloudinaryCredentials
  ? new CloudinaryStorage({
      cloudinary,
      params: async (_req, file) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const safeBaseName = path
          .basename(file.originalname, ext)
          .trim()
          .replace(/[^a-zA-Z0-9-_]/g, "-")
          .slice(0, 50);

        return {
          folder: cloudinaryFolder,
          resource_type: "image",
          public_id: `${Date.now()}-${safeBaseName || "produto"}`,
        };
      },
    })
  : null;

const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  if (!allowedMimeTypes.includes(file.mimetype)) {
    cb(new Error("Formato de imagem inválido. Use JPG, PNG ou WEBP."));
    return;
  }

  cb(null, true);
};

const storage = (cloudinaryStorage ?? localStorage) as multer.StorageEngine;

export const uploadProdutoImagem = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_SIZE },
  fileFilter,
});
