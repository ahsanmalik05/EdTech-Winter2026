export interface GenerateTemplateRequest {
  subject: string;
  topic: string;
  gradeLevel: string;
  language?: string;
}

export interface TemplateSections {
  introduction: string;
  model_assessment: string;
  self_review: string;
}

export interface TemplateResponse {
  id: number;
  subject: string;
  topic: string;
  gradeLevel: string;
  version: number;
  isActive: boolean;
  sections: TemplateSections;
  createdAt: string;
  updatedAt: string;
}

export interface ListTemplatesQuery {
  subject?: string;
  gradeLevel?: string;
  isActive?: boolean;
}

export interface UpdateTemplateRequest {
  subject?: string;
  topic?: string;
  gradeLevel?: string;
  sections?: Partial<TemplateSections>;
}

export interface ValidationResult {
  valid: boolean;
  issues: string[];
}
