import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { fileTypeFromBuffer, fileTypeFromFile } from 'file-type';
import { v4 as uuid } from 'uuid';
import type { ImageAsset } from '@njstore/types';
import { cloudinary, isCloudinaryConfigured } from '../config/cloudinary.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';

export interface UploadBufferInput {
  file: Express.Multer.File;
  folder: string;
  baseUrl: string;
  allowedMimeTypes: string[];
  alt?: string;
  resourceType?: 'image' | 'raw' | 'auto';
  allowMimeFallback?: boolean;
  visibility?: 'public' | 'private';
}

export interface UploadGeneratedBufferInput {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  folder: string;
  baseUrl: string;
  alt?: string;
  resourceType?: 'image' | 'raw' | 'auto';
}

const publicUploadsRoot = path.resolve(process.cwd(), 'public', 'uploads');
const privateUploadsRoot = path.resolve(process.cwd(), 'private', 'uploads');
const publicUploadsFallbackRoot = path.resolve(os.tmpdir(), 'njstore', 'public', 'uploads');
const privateUploadsFallbackRoot = path.resolve(os.tmpdir(), 'njstore', 'private', 'uploads');
const PRIVATE_CLOUDINARY_PREFIX = 'cloudinary-private:';
const PRIVATE_CLOUDINARY_URL_TTL_SECONDS = 5 * 60;

const localUploadRoots = {
  public: [publicUploadsRoot, publicUploadsFallbackRoot],
  private: [privateUploadsRoot, privateUploadsFallbackRoot]
} as const;

const cleanupUploadedTempFile = async (file: Express.Multer.File): Promise<void> => {
  if (file.buffer || !file.path) {
    return;
  }

  const resolvedFilePath = path.resolve(file.path);
  const resolvedTempRoot = path.resolve(os.tmpdir());
  if (resolvedFilePath === resolvedTempRoot || !resolvedFilePath.startsWith(`${resolvedTempRoot}${path.sep}`)) {
    return;
  }

  try {
    await fs.rm(resolvedFilePath, { force: true });
  } catch (error) {
    logger.warn(`upload.temp_cleanup_failed path=${resolvedFilePath} reason=${error instanceof Error ? error.message : 'unknown'}`);
  }
};

const ensureDirectory = async (root: string, folder: string): Promise<string> => {
  const target = path.join(root, folder);
  await fs.mkdir(target, { recursive: true });
  return target;
};

const detectFile = async (
  file: Express.Multer.File,
  allowMimeFallback: boolean
): Promise<{ ext: string; mime: string }> => {
  const detected = file.buffer ? await fileTypeFromBuffer(file.buffer) : await fileTypeFromFile(file.path);
  if (detected) {
    return { ext: detected.ext, mime: detected.mime };
  }

  if (!allowMimeFallback) {
    throw new AppError('Unable to verify file signature', 400);
  }

  const fallback = file.originalname.split('.').pop()?.toLowerCase() || 'bin';
  return {
    ext: fallback,
    mime: file.mimetype
  };
};

const resolveCloudinaryResourceType = (
  resourceType: UploadBufferInput['resourceType'],
  mime: string
): 'image' | 'raw' =>
  resourceType === 'auto'
    ? (mime.startsWith('image/') ? 'image' : 'raw')
    : (resourceType ?? 'image');

const encodePrivateCloudinaryPublicId = (
  resourceType: 'image' | 'raw',
  format: string,
  publicId: string
): string => `${PRIVATE_CLOUDINARY_PREFIX}${resourceType}:${format}:${publicId}`;

const parsePrivateCloudinaryPublicId = (
  publicId: string
): { resourceType: 'image' | 'raw'; format: string; assetPublicId: string } | null => {
  if (!publicId.startsWith(PRIVATE_CLOUDINARY_PREFIX)) {
    return null;
  }

  const encoded = publicId.slice(PRIVATE_CLOUDINARY_PREFIX.length);
  const [resourceType, format, ...rest] = encoded.split(':');
  if ((resourceType !== 'image' && resourceType !== 'raw') || !format || rest.length === 0) {
    throw new AppError('Invalid private Cloudinary asset identifier', 500);
  }

  return {
    resourceType,
    format,
    assetPublicId: rest.join(':')
  };
};

const uploadToCloudinary = async (
  file: Express.Multer.File,
  folder: string,
  resourceType: 'image' | 'raw',
  options?: { visibility?: 'public' | 'private' }
): Promise<{ url: string; publicId: string; resourceType: 'image' | 'raw' }> =>
  new Promise((resolve, reject) => {
    if (!file.buffer) {
      cloudinary.uploader.upload(file.path, {
        folder,
        resource_type: resourceType,
        type: options?.visibility === 'private' ? 'private' : 'upload',
        quality: resourceType === 'image' ? 'auto' : undefined,
        fetch_format: resourceType === 'image' ? 'auto' : undefined
      }).then(result => {
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          resourceType: result.resource_type === 'raw' ? 'raw' : 'image'
        });
      }).catch(err => reject(err ?? new AppError('Upload failed', 500)));
      return;
    }

    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        type: options?.visibility === 'private' ? 'private' : 'upload',
        quality: resourceType === 'image' ? 'auto' : undefined,
        fetch_format: resourceType === 'image' ? 'auto' : undefined
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new AppError('Upload failed', 500));
          return;
        }

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          resourceType: result.resource_type === 'raw' ? 'raw' : 'image'
        });
      }
    );

    stream.end(file.buffer);
  });

const writeLocally = async (
  visibility: 'public' | 'private',
  folder: string,
  fileName: string,
  file: Express.Multer.File
): Promise<void> => {
  let lastError: unknown;

  for (const root of localUploadRoots[visibility]) {
    try {
      const directory = await ensureDirectory(root, folder);
      const filePath = path.join(directory, fileName);
      if (file.buffer) { await fs.writeFile(filePath, file.buffer); } else { await fs.copyFile(file.path, filePath); }
      return;
    } catch (error) {
      lastError = error;
      logger.warn(
        `upload.local_write_failed visibility=${visibility} root=${root} folder=${folder} reason=${
          error instanceof Error ? error.message : 'unknown'
        }`
      );
    }
  }

  throw new AppError(
    `Unable to store ${visibility === 'private' ? 'private' : 'public'} asset locally${
      lastError instanceof Error ? `: ${lastError.message}` : ''
    }`,
    500
  );
};

/**
 * Uploads a file to Cloudinary when configured, or to a local public uploads folder otherwise.
 */
export const uploadBuffer = async ({
  file,
  folder,
  baseUrl,
  allowedMimeTypes,
  alt,
  resourceType = 'image',
  allowMimeFallback = false,
  visibility = 'public'
}: UploadBufferInput): Promise<ImageAsset> => {
  try {
    const detected = await detectFile(file, allowMimeFallback);
    const resolvedResourceType = resolveCloudinaryResourceType(resourceType, detected.mime);

    if (!allowedMimeTypes.includes(detected.mime)) {
      throw new AppError('Unsupported file type', 400);
    }

    if (isCloudinaryConfigured) {
      try {
        const uploaded = await uploadToCloudinary(file, folder, resolvedResourceType, { visibility });
        return {
          url: uploaded.url,
          publicId:
            visibility === 'private'
              ? encodePrivateCloudinaryPublicId(uploaded.resourceType, detected.ext, uploaded.publicId)
              : uploaded.publicId,
          alt
        };
      } catch (error) {
        logger.warn(
          `upload.cloudinary_failed visibility=${visibility} folder=${folder} reason=${
            error instanceof Error ? error.message : 'unknown'
          }`
        );
      }
    }

    const isPrivateAsset = visibility === 'private';
    const fileName = `${uuid()}.${detected.ext}`;
    await writeLocally(isPrivateAsset ? 'private' : 'public', folder, fileName, file);

    return {
      url: isPrivateAsset ? `${baseUrl}/api/v1/assets/local/${folder}/${fileName}` : `${baseUrl}/uploads/${folder}/${fileName}`,
      publicId: `${isPrivateAsset ? 'private' : 'local'}:${folder}/${fileName}`,
      alt
    };
  } finally {
    await cleanupUploadedTempFile(file);
  }
};

export const removeAsset = async (publicId: string): Promise<void> => {
  if (!publicId) {
    return;
  }

  const privateCloudinaryAsset = parsePrivateCloudinaryPublicId(publicId);
  if (privateCloudinaryAsset) {
    await cloudinary.uploader.destroy(privateCloudinaryAsset.assetPublicId, {
      invalidate: true,
      resource_type: privateCloudinaryAsset.resourceType,
      type: 'private'
    });
    return;
  }

  if (publicId.startsWith('local:') || publicId.startsWith('private:')) {
    const isPrivateAsset = publicId.startsWith('private:');
    const relativePath = publicId.replace(isPrivateAsset ? 'private:' : 'local:', '');
    const absolutePath = path.resolve(isPrivateAsset ? privateUploadsRoot : publicUploadsRoot, relativePath);
    await fs.rm(absolutePath, { force: true });
    return;
  }

  await cloudinary.uploader.destroy(publicId, { invalidate: true });
};

export const uploadGeneratedBuffer = async ({
  buffer,
  fileName,
  mimeType,
  folder,
  baseUrl,
  alt,
  resourceType = 'raw'
}: UploadGeneratedBufferInput): Promise<ImageAsset> =>
  uploadBuffer({
    file: {
      fieldname: folder,
      originalname: fileName,
      encoding: '7bit',
      mimetype: mimeType,
      size: buffer.byteLength,
      buffer,
      stream: Readable.from(buffer),
      destination: '',
      filename: fileName,
      path: ''
    },
    folder,
    baseUrl,
    allowedMimeTypes: [mimeType],
    alt,
    resourceType,
    allowMimeFallback: true
  });

export const isLocalAsset = (publicId: string): boolean => publicId.startsWith('local:') || publicId.startsWith('private:');

export const resolveAssetDeliveryUrl = (asset: { publicId: string; url: string }): string => {
  const privateCloudinaryAsset = parsePrivateCloudinaryPublicId(asset.publicId);
  if (!privateCloudinaryAsset) {
    return asset.url;
  }

  if (!isCloudinaryConfigured) {
    throw new AppError('Private Cloudinary assets are unavailable', 500);
  }

  return cloudinary.utils.private_download_url(privateCloudinaryAsset.assetPublicId, privateCloudinaryAsset.format, {
    resource_type: privateCloudinaryAsset.resourceType,
    type: 'private',
    expires_at: Math.floor(Date.now() / 1000) + PRIVATE_CLOUDINARY_URL_TTL_SECONDS
  });
};

export const resolveLocalAssetPath = (publicId: string): string => {
  if (!isLocalAsset(publicId)) {
    throw new AppError('Asset is not stored locally', 400);
  }

  const isPrivateAsset = publicId.startsWith('private:');
  const relativePath = publicId.replace(isPrivateAsset ? 'private:' : 'local:', '');
  const roots = isPrivateAsset ? localUploadRoots.private : localUploadRoots.public;

  for (const root of roots) {
    const candidate = path.resolve(root, relativePath);
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return path.resolve(roots[0], relativePath);
};
