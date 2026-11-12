export type ShareRole = 'editor' | 'viewer';

export interface ShareInfo {
  user_id: number;
  name: string;
  email: string;
  avatar_color: string;
  role: ShareRole;
}

export interface ShareRequest {
  target_user_id: number;
  role: ShareRole;
}

