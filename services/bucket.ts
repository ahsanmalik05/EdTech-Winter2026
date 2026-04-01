import { createHash } from "crypto";
import fs from "fs";
import fsp from "fs/promises";
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import config from "../config/config.js";

const s3 = new S3Client({
  endpoint: config.bucket.endpoint,
  region: config.bucket.region,
  credentials: {
    accessKeyId: config.bucket.accessKeyId,
    secretAccessKey: config.bucket.secretAccessKey,
  },
  forcePathStyle: true,
});

export function computeFileHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = fs.createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}

export function computeTextHash(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function buildObjectKey(hash: string): string {
  const env = config.nodeEnv || "development";
  return `pdf-archives/${env}/${hash}.pdf`;
}

export async function objectExists(objectKey: string): Promise<boolean> {
  try {
    await s3.send(
      new HeadObjectCommand({
        Bucket: config.bucket.name,
        Key: objectKey,
      }),
    );
    return true;
  } catch {
    return false;
  }
}

export async function uploadToBucket(
  filePath: string,
  contentHash: string,
): Promise<{ objectKey: string; uploaded: boolean }> {
  const objectKey = buildObjectKey(contentHash);

  const exists = await objectExists(objectKey);
  if (exists) {
    return { objectKey, uploaded: false };
  }

  const body = await fsp.readFile(filePath);
  await s3.send(
    new PutObjectCommand({
      Bucket: config.bucket.name,
      Key: objectKey,
      Body: body,
      ContentType: "application/pdf",
    }),
  );

  return { objectKey, uploaded: true };
}

export function buildObjectKeyFromHash(hash: string): string {
  return buildObjectKey(hash);
}
