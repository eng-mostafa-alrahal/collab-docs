import { ShareInfo } from './sharing.model';

export type DocumentRole = 'owner' | 'editor' | 'viewer';

export interface DocumentSummary {
  id: number;
  title: string;
  owner_id: number;
  owner_name: string;
  owner_avatar_color: string;
  role: DocumentRole;
  source_filename: string | null;
  updated_at: string;
  shares: ShareInfo[];
}

export interface DocumentDetail extends DocumentSummary {
  content_html: string;
  created_at: string;
  version: number;
}

export interface DocumentListResponse {
  owned: DocumentSummary[];
  shared: DocumentSummary[];
}

export interface DocumentCreateRequest {
  title: string;
  content_html?: string;
}

export interface DocumentRenameRequest {
  title: string;
}

export interface DocumentContentUpdateRequest {
  content_html: string;
  version: number;
}

