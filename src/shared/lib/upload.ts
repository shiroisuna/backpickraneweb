import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';

const uploadDir = path.resolve('src/uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const nombreUnico = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, nombreUnico);
  },
});

const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB por archivo
  fileFilter: (_req, file, cb) => {
    if (!tiposPermitidos.includes(file.mimetype)) {
      return cb(new Error('Tipo de archivo no permitido. Usa JPG, PNG, WEBP o PDF.'));
    }
    cb(null, true);
  },
});
