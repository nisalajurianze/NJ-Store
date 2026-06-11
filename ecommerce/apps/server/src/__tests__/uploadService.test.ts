import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { uploadMock, uploadStreamMock, destroyMock, privateDownloadUrlMock } = vi.hoisted(() => ({
  uploadMock: vi.fn(),
  uploadStreamMock: vi.fn(),
  destroyMock: vi.fn(),
  privateDownloadUrlMock: vi.fn()
}));

vi.mock('../config/cloudinary.js', () => ({
  isCloudinaryConfigured: true,
  cloudinary: {
    uploader: {
      upload: uploadMock,
      upload_stream: uploadStreamMock,
      destroy: destroyMock
    },
    utils: {
      private_download_url: privateDownloadUrlMock
    }
  }
}));

import { removeAsset, resolveAssetDeliveryUrl, uploadBuffer } from '../services/uploadService.js';

const PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WlH0L0AAAAASUVORK5CYII=',
  'base64'
);

const createFile = (name: string, mimeType: string, buffer: Buffer): Express.Multer.File =>
  ({
    fieldname: 'receipt',
    originalname: name,
    encoding: '7bit',
    mimetype: mimeType,
    size: buffer.byteLength,
    buffer,
    stream: Readable.from(buffer),
    destination: '',
    filename: name,
    path: ''
  }) as Express.Multer.File;

describe('uploadService private Cloudinary assets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    uploadStreamMock.mockImplementation(
      (_options: unknown, callback: (error: Error | null, result?: { secure_url: string; public_id: string; resource_type: string }) => void) => ({
        end: () =>
          callback(null, {
            secure_url: 'https://res.cloudinary.com/demo/image/private/v1/receipts/receipt.png',
            public_id: 'receipts/receipt',
            resource_type: 'image'
          })
      })
    );
    destroyMock.mockResolvedValue(undefined);
    privateDownloadUrlMock.mockReturnValue('https://signed.example.com/private-receipt');
    uploadMock.mockResolvedValue({
      secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/receipts/disk-receipt.png',
      public_id: 'receipts/disk-receipt',
      resource_type: 'image'
    });
  });

  it('encodes private Cloudinary receipts and resolves a signed delivery URL', async () => {
    const asset = await uploadBuffer({
      file: createFile('receipt.png', 'image/png', PNG_BUFFER),
      folder: 'receipts',
      baseUrl: 'http://localhost:5000',
      allowedMimeTypes: ['image/png'],
      resourceType: 'auto',
      visibility: 'private'
    });

    expect(uploadStreamMock).toHaveBeenCalledWith(
      expect.objectContaining({
        folder: 'receipts',
        resource_type: 'image',
        type: 'private'
      }),
      expect.any(Function)
    );

    expect(asset.publicId).toBe('cloudinary-private:image:png:receipts/receipt');
    expect(resolveAssetDeliveryUrl(asset)).toBe('https://signed.example.com/private-receipt');
    expect(privateDownloadUrlMock).toHaveBeenCalledWith(
      'receipts/receipt',
      'png',
      expect.objectContaining({
        resource_type: 'image',
        type: 'private'
      })
    );

    await removeAsset(asset.publicId);
    expect(destroyMock).toHaveBeenCalledWith(
      'receipts/receipt',
      expect.objectContaining({
        invalidate: true,
        resource_type: 'image',
        type: 'private'
      })
    );
  });

  it('removes disk-backed multer temp files after upload completes', async () => {
    const tempPath = path.join(os.tmpdir(), `njstore-upload-test-${Date.now()}.png`);
    await fs.writeFile(tempPath, PNG_BUFFER);

    await uploadBuffer({
      file: {
        ...createFile('disk-receipt.png', 'image/png', Buffer.alloc(0)),
        buffer: undefined,
        path: tempPath
      } as Express.Multer.File,
      folder: 'receipts',
      baseUrl: 'http://localhost:5000',
      allowedMimeTypes: ['image/png'],
      resourceType: 'auto'
    });

    expect(uploadMock).toHaveBeenCalledWith(
      tempPath,
      expect.objectContaining({
        folder: 'receipts',
        resource_type: 'image'
      })
    );
    expect(existsSync(tempPath)).toBe(false);
  });
});
