import { randomUUID } from "node:crypto";
import path from "node:path";
import fsp from "node:fs/promises";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import config from "../config/config.js";

export interface UploadFileToBucketParams {
  filePath: string;
  originalName: string;
  mimeType: string;
  flow: string;
}

export interface BucketUploadResult {
  bucketName: string;
  objectKey: string;
}

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!config.bucket.enabled) {
    throw new Error("Railway bucket configuration is incomplete");
  }

  if (!s3Client) {
    s3Client = new S3Client({
      region: config.bucket.region,
      endpoint: config.bucket.endpoint,
      forcePathStyle: config.bucket.forcePathStyle,
      credentials: {
        accessKeyId: config.bucket.accessKeyId,
        secretAccessKey: config.bucket.secretAccessKey,
      },
    });
  }

  return s3Client;
}

function sanitizeFileName(fileName: string): string {
  const parsed = path.parse(fileName);
  const safeBase = parsed.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  const ext = parsed.ext.toLowerCase() || ".pdf";
  const baseName = safeBase || "upload";
  return `${baseName}${ext}`;
}

function buildObjectKey(flow: string, originalName: string): string {
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  const timestamp = now.toISOString().replace(/[:.]/g, "-");
  const safeOriginalName = sanitizeFileName(originalName);

  return [
    "pdf-archives",
    config.nodeEnv,
    flow,
    year,
    month,
    day,
    `${timestamp}-${randomUUID()}-${safeOriginalName}`,
  ].join("/");
}

export function isBucketConfigured(): boolean {
  return config.bucket.enabled;
}

export async function uploadFileToBucket(
  params: UploadFileToBucketParams,
): Promise<BucketUploadResult> {
  const client = getS3Client();
  const objectKey = buildObjectKey(params.flow, params.originalName);
  const body = await fsp.readFile(params.filePath);

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket.bucketName,
      Key: objectKey,
      Body: body,
      ContentType: params.mimeType,
    }),
  );

  return {
    bucketName: config.bucket.bucketName,
    objectKey,
  };
}
