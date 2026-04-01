export interface CreateApiKeyRequest {
  label: string;
  scopes: ("read" | "write" | "translate")[];
}

export interface UpdateApiKeyRequest {
  label?: string;
  scopes?: ("read" | "write" | "translate")[];
}

export interface ApiKeyResponse {
  id: number;
  label: string;
  scopes: ("read" | "write" | "translate")[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateApiKeyResponse {
  api_key: ApiKeyResponse & {
    key: string;
  };
}

export interface GetApiKeysResponse {
  allKeys: ApiKeyResponse[];
}

export interface DeleteApiKeyResponse {
  message: string;
}
