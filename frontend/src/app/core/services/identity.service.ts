import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { User } from '../models/user.model';
import { ApiService } from './api.service';

const STORAGE_KEY = 'ajaia_docs_active_user_id';

@Injectable({ providedIn: 'root' })
export class IdentityService {
  private readonly api = inject(ApiService);

  readonly users = signal<User[]>([]);
  readonly currentUser = signal<User | null>(null);
  readonly loading = signal<boolean>(true);
  readonly error = signal<string | null>(null);
  readonly hasUnsavedChanges = signal<boolean>(false);

  async initialize(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const demoUsers = await firstValueFrom(this.api.getUsers());
      this.users.set(demoUsers);

      const savedIdRaw = localStorage.getItem(STORAGE_KEY);
      const savedId = savedIdRaw ? Number(savedIdRaw) : null;
      const matched = demoUsers.find((u) => u.id === savedId) ?? demoUsers[0] ?? null;

      if (matched) {
        this.currentUser.set(matched);
        localStorage.setItem(STORAGE_KEY, String(matched.id));
      } else {
        this.currentUser.set(null);
      }
    } catch {
      this.error.set('Unable to load demo accounts. Check that the backend API is running.');
    } finally {
      this.loading.set(false);
    }
  }

  switchUser(user: User): void {
    this.hasUnsavedChanges.set(false);
    this.currentUser.set(user);
    localStorage.setItem(STORAGE_KEY, String(user.id));
  }

  setUnsavedChanges(isDirty: boolean): void {
    this.hasUnsavedChanges.set(isDirty);
  }
}

