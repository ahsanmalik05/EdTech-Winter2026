import * as express from 'express';
declare global {
  namespace Express {
    interface Request {
      apiKey?: {
        id: number;
        user_id: number;
        label: string;
        scopes: ("read" | "write" | "translate")[];
      };
    }
  }
}
