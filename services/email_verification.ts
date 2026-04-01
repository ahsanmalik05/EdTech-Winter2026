import crypto from 'node:crypto';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { email_verification_tokens, users } from '../db/schema.js';

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export async function createEmailVerificationToken(userId: number): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = sha256(rawToken);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await db.insert(email_verification_tokens).values({
    userId,
    tokenHash,
    expiresAt,
  });

  return rawToken;
}

export async function consumeEmailVerificationToken(rawToken: string): Promise<number | null> {
  const tokenHash = sha256(rawToken);

  const [record] = await db
    .select()
    .from(email_verification_tokens)
    .where(
      and(
        eq(email_verification_tokens.tokenHash, tokenHash),
        isNull(email_verification_tokens.usedAt),
        gt(email_verification_tokens.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!record) {
    return null;
  }

  await db
    .update(email_verification_tokens)
    .set({ usedAt: new Date() })
    .where(eq(email_verification_tokens.id, record.id));

  await db
    .update(users)
    .set({ emailVerified: true, emailVerifiedAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, record.userId));

  return record.userId;
}
