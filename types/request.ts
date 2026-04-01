import * as express from 'express';
import type { ApiKeyResponse } from './apiKey.js';

declare global {
  namespace Express {
    interface Request {
      apiKey?: ApiKeyResponse & {
        id: number;
        user_id: number;
      };
      user?: {
        id: number;
      };
    }
  }
}
