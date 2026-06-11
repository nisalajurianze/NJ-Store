import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { AppError } from '../utils/AppError.js';

import os from 'node:os';
import path from 'node:path';

const diskStorage = multer.diskStorage({
  destination: os.tmpdir(),
  filename: (_req, file, callback) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    callback(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const createUploader = (maxSizeInMb: number, allowedMimeTypes: string[], maxFileCount?: number) =>
  multer({
    storage: diskStorage,
    limits: {
      fileSize: maxSizeInMb * 1024 * 1024,
      files: maxFileCount
    },
    fileFilter: (_req, file, callback) => {
      if (!allowedMimeTypes.includes(file.mimetype)) {
        callback(new AppError('Unsupported file type', 400));
        return;
      }

      callback(null, true);
    }
  });

export const uploadReceipt = createUploader(5, ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'], 5).fields([
  { name: 'receipt', maxCount: 5 },
  { name: 'receipts', maxCount: 5 }
]);
export const uploadReturnEvidence = createUploader(8, ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'], 6).fields([
  { name: 'evidence', maxCount: 6 },
  { name: 'evidences', maxCount: 6 }
]);
export const uploadAvatar = createUploader(2, ['image/jpeg', 'image/png', 'image/webp'], 1).single('avatar');
export const uploadBrandLogo = createUploader(3, ['image/jpeg', 'image/png', 'image/webp'], 1).single('logo');
export const uploadCategoryImage = createUploader(3, ['image/jpeg', 'image/png', 'image/webp'], 1).single('image');
export const uploadStoreLogo = createUploader(3, ['image/jpeg', 'image/png', 'image/webp'], 1).single('logo');
export const uploadHomeBannerImage = createUploader(5, ['image/jpeg', 'image/png', 'image/webp'], 1).single('image');
export const uploadProductImages = createUploader(5, ['image/jpeg', 'image/png', 'image/webp'], 6).array('images', 6);
export const uploadCsv = createUploader(10, ['text/csv', 'application/vnd.ms-excel', 'application/csv'], 1).single('file');

export const collectUploadedFiles = (req: Request): Express.Multer.File[] => {
  if (req.file) {
    return [req.file];
  }

  if (!req.files) {
    return [];
  }

  if (Array.isArray(req.files)) {
    return req.files;
  }

  return Object.values(req.files).flat();
};

export const requireFile =
  (fieldName: string) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (collectUploadedFiles(req).length === 0) {
      next(new AppError(`${fieldName} is required`, 400));
      return;
    }
    next();
  };
