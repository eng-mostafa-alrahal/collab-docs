import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { DocumentSummary } from '../../core/models/document.model';
import { ShareInfo, ShareRole } from '../../core/models/sharing.model';
import { ApiService } from '../../core/services/api.service';
import { IdentityService } from '../../core/services/identity.service';

@Component({
  selector: 'app-share-modal',
  standalone: true,
  imports: [FormsModule],
  template: `
    @if (open() && document(); as doc) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 backdrop-blur-xs"
        role="dialog"
        aria-modal="true"
      >
        <div class="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 class="text-lg font-semibold text-slate-900">Share "{{ doc.title }}"</h2>
              <p class="mt-0.5 text-sm text-slate-500">
                Owner: <span class="font-medium text-slate-700">{{ doc.owner_name }}</span>
              </p>
            </div>
            <button
              type="button"
              (click)="closed.emit()"
              class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Close share dialog"
            >
              ✕
            </button>
          </div>

          @if (error()) {
            <div class="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {{ error() }}
            </div>
          }

          @if (isOwner()) {
            <div class="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <label class="block text-xs font-semibold uppercase tracking-wide text-slate-600">
                Grant or update access
              </label>
              <div class="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
                <select
                  [(ngModel)]="selectedUserId"
                  class="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
                >
                  @for (user of availableUsers(); track user.id) {
                    <option [ngValue]="user.id">{{ user.name }} ({{ user.email }})</option>
                  }
                </select>

                <select
                  [(ngModel)]="selectedRole"
                  class="w-full shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none sm:w-auto"
                >
                  <option value="editor">Can Edit</option>
                  <option value="viewer">View Only</option>
                </select>

                <button
                  type="button"
                  [disabled]="busy() || !selectedUserId()"
                  (click)="grantAccess()"
                  class="w-full shrink-0 whitespace-nowrap rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  {{ busy() ? 'Saving...' : 'Grant Access' }}
                </button>
              </div>
            </div>
          } @else {
            <div class="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
              Only the document owner can manage sharing permissions.
            </div>
          }

          <div class="mt-6">
            <h3 class="text-xs font-semibold uppercase tracking-wide text-slate-500">
              People with access
            </h3>
            <ul class="mt-2.5 divide-y divide-slate-100 rounded-xl border border-slate-200">
              <li class="flex items-center justify-between px-3.5 py-2.5">
                <div class="flex items-center gap-3">
                  <span
                    class="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                    [style.backgroundColor]="doc.owner_avatar_color"
                  >
                    {{ doc.owner_name.charAt(0) }}
                  </span>
                  <div>
                    <p class="text-sm font-medium text-slate-900">{{ doc.owner_name }}</p>
                    <p class="text-xs text-slate-500">Document owner</p>
                  </div>
                </div>
                <span class="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                  Owner
                </span>
              </li>

              @for (share of doc.shares; track share.user_id) {
                <li class="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5">
                  <div class="flex items-center gap-3">
                    <span
                      class="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                      [style.backgroundColor]="share.avatar_color"
                    >
                      {{ share.name.charAt(0) }}
                    </span>
                    <div>
                      <p class="text-sm font-medium text-slate-900">{{ share.name }}</p>
                      <p class="text-xs text-slate-500">{{ share.email }}</p>
                    </div>
                  </div>

                  @if (isOwner()) {
                    <div class="flex items-center gap-2">
                      <select
                        [ngModel]="share.role"
                        (ngModelChange)="updateCollaboratorRole(share, $event)"
                        [disabled]="busy()"
                        class="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none"
                      >
                        <option value="editor">Can Edit</option>
                        <option value="viewer">View Only</option>
                      </select>
                      <button
                        type="button"
                        [disabled]="busy()"
                        (click)="revokeCollaborator(share)"
                        class="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        Revoke
                      </button>
                    </div>
                  } @else {
                    <span
                      [class]="
                        share.role === 'editor'
                          ? 'rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700'
                          : 'rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700'
                      "
                    >
                      {{ share.role === 'editor' ? 'Can Edit' : 'View Only' }}
                    </span>
                  }
                </li>
              } @empty {
                <li class="px-3.5 py-4 text-center text-sm text-slate-500">
                  No collaborators yet.
                </li>
              }
            </ul>
          </div>

          <div class="mt-6 flex justify-end">
            <button
              type="button"
              (click)="closed.emit()"
              class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ShareModalComponent {
  private readonly api = inject(ApiService);
  private readonly identity = inject(IdentityService);

  readonly open = input.required<boolean>();
  readonly document = input<DocumentSummary | null>(null);

  readonly closed = output<void>();
  readonly updated = output<void>();

  readonly selectedUserId = signal<number | null>(null);
  readonly selectedRole = signal<ShareRole>('editor');
  readonly busy = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  readonly isOwner = computed(() => this.document()?.role === 'owner');
  readonly availableUsers = computed(() => {
    const doc = this.document();
    const users = this.identity.users().filter((u) => u.id !== doc?.owner_id);
    if (users.length > 0 && (this.selectedUserId() === null || !users.some((u) => u.id === this.selectedUserId()))) {
      queueMicrotask(() => this.selectedUserId.set(users[0].id));
    }
    return users;
  });

  async grantAccess(): Promise<void> {
    const doc = this.document();
    const targetUserId = this.selectedUserId();
    if (!doc || !targetUserId) {
      return;
    }

    this.busy.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(
        this.api.shareDocument(doc.id, {
          target_user_id: targetUserId,
          role: this.selectedRole(),
        }),
      );
      this.updated.emit();
    } catch (err) {
      this.error.set(this.extractError(err, 'Failed to share document.'));
    } finally {
      this.busy.set(false);
    }
  }

  async updateCollaboratorRole(share: ShareInfo, role: ShareRole): Promise<void> {
    const doc = this.document();
    if (!doc) {
      return;
    }

    this.busy.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(
        this.api.shareDocument(doc.id, {
          target_user_id: share.user_id,
          role,
        }),
      );
      this.updated.emit();
    } catch (err) {
      this.error.set(this.extractError(err, 'Failed to update role.'));
    } finally {
      this.busy.set(false);
    }
  }

  async revokeCollaborator(share: ShareInfo): Promise<void> {
    const doc = this.document();
    if (!doc) {
      return;
    }

    this.busy.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(this.api.revokeAccess(doc.id, share.user_id));
      this.updated.emit();
    } catch (err) {
      this.error.set(this.extractError(err, 'Failed to revoke access.'));
    } finally {
      this.busy.set(false);
    }
  }

  private extractError(err: unknown, fallback: string): string {
    if (err instanceof HttpErrorResponse && err.error?.detail) {
      return String(err.error.detail);
    }
    return fallback;
  }
}

