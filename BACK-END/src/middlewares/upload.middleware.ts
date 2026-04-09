import fs from "fs";
import path from "path";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;
const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];

const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
const cloudinaryProdutoFolder = process.env.CLOUDINARY_FOLDER?.trim() || "projeto-tcc/produtos";
const cloudinaryAtendimentoFolder =
  process.env.CLOUDINARY_CHAT_FOLDER?.trim() || "projeto-tcc/atendimento";

const hasCloudinaryCredentials = Boolean(cloudName && apiKey && apiSecret);

if (hasCloudinaryCredentials) {
  cloudinary.config({
    cloud_name: cloudName!,
    api_key: apiKey!,
    api_secret: apiSecret!,
  });
}

type UploadConfig = {
  localFolderName: string;
  cloudinaryFolder: string;
  filePrefix: string;
};

const createSafeFileName = (file: Express.Multer.File, fallbackName: string) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const safeBaseName = path
    .basename(file.originalname, ext)
    .trim()
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .slice(0, 50);

  return {
    ext,
    safeBaseName: safeBaseName || fallbackName,
  };
};

const createDiskStorage = (config: UploadConfig) =>
  multer.diskStorage({
    destination: (_req, _file, cb) => {
      const uploadDir = path.resolve(process.cwd(), "public", "uploads", config.localFolderName);
      fs.mkdirSync(uploadDir, { recursive: true });
      cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
      const { ext, safeBaseName } = createSafeFileName(file, config.filePrefix);
      cb(null, `${Date.now()}-${safeBaseName}${ext}`);
    },
  });

const createCloudinaryStorage = (config: UploadConfig) => {
  if (!hasCloudinaryCredentials) {
    return null;
  }

  return new CloudinaryStorage({
    cloudinary,
    params: async (_req, file) => {
      const { safeBaseName } = createSafeFileName(file, config.filePrefix);

      return {
        folder: config.cloudinaryFolder,
        resource_type: "image",
        public_id: `${Date.now()}-${safeBaseName}`,
      };
    },
  });
};

const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  if (!allowedMimeTypes.includes(file.mimetype)) {
    cb(new Error("Formato de imagem inválido. Use JPG, PNG ou WEBP."));
    return;
  }

  cb(null, true);
};

const createImageUploader = (config: UploadConfig) => {
  const cloudStorage = createCloudinaryStorage(config);
  const diskStorage = createDiskStorage(config);
  const storage = (cloudStorage ?? diskStorage) as multer.StorageEngine;

  return multer({
    storage,
    limits: { fileSize: MAX_UPLOAD_SIZE },
    fileFilter,
  });
};

export const uploadProdutoImagem = createImageUploader({
  localFolderName: "produtos",
  cloudinaryFolder: cloudinaryProdutoFolder,
  filePrefix: "produto",
});

export const uploadAtendimentoImagem = createImageUploader({
  localFolderName: "atendimento",
  cloudinaryFolder: cloudinaryAtendimentoFolder,
  filePrefix: "atendimento",
});
