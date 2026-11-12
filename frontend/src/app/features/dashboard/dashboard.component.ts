import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { DocumentSummary } from '../../core/models/document.model';
import { ApiService } from '../../core/services/api.service';
import { IdentityService } from '../../core/services/identity.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { ShareModalComponent } from '../sharing/share-modal.component';

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DatePipe, RouterLink, ConfirmDialogComponent, ShareModalComponent],
  template: `
    <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <!-- Header & Primary Actions -->
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-slate-900">Documents</h1>
          @if (identity.currentUser(); as user) {
            <p class="mt-1 text-sm text-slate-500">
              Viewing workspace as <span class="font-medium text-slate-700">{{ user.name }}</span>
            </p>
          }
        </div>

        <div class="flex flex-col items-start gap-2 sm:items-end">
          <div class="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              [disabled]="creating() || uploading()"
              (click)="createDocument()"
              class="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-blue-700 disabled:opacity-50"
            >
              <span>+ New Document</span>
            </button>

            <label
              class="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50"
              [class.pointer-events-none]="uploading()"
              [class.opacity-50]="uploading()"
            >
              <span>{{ uploading() ? 'Importing...' : 'Import File' }}</span>
              <input
                type="file"
                accept=".txt,.md"
                class="hidden"
                (change)="onFileSelected($event)"
              />
            </label>
          </div>
          <p class="text-xs text-slate-500">
            Supported formats: TXT and Markdown. Maximum file size: 2 MB.
          </p>
        </div>
      </div>

      <!-- Feedback Banners -->
      @if (actionError()) {
        <div class="mt-5 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{{ actionError() }}</span>
          <button
            type="button"
            (click)="actionError.set(null)"
            class="font-medium text-red-800 hover:underline"
          >
            Dismiss
          </button>
        </div>
      }

      @if (loading()) {
        <div class="mt-12 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-16">
          <div class="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p class="mt-3 text-sm font-medium text-slate-600">Loading documents...</p>
        </div>
      } @else if (loadError()) {
        <div class="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <p class="text-sm font-semibold text-red-800">{{ loadError() }}</p>
          <button
            type="button"
            (click)="loadDocuments()"
            class="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      } @else if (isEmpty()) {
        <div class="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-xl font-bold text-blue-600">
            D
          </div>
          <h2 class="mt-4 text-lg font-semibold text-slate-900">No documents yet</h2>
          <p class="mt-1 text-sm text-slate-500">
            Create your first document or import an existing TXT or Markdown file to get started.
          </p>
          <div class="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              (click)="createDocument()"
              class="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              + New Document
            </button>
            <label
              class="cursor-pointer rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Import File
              <input
                type="file"
                accept=".txt,.md"
                class="hidden"
                (change)="onFileSelected($event)"
              />
            </label>
          </div>
        </div>
      } @else {
        <!-- Section A: Owned by Me -->
        <section class="mt-8">
          <div class="flex items-center justify-between">
            <h2 class="text-base font-semibold text-slate-900">
              Owned by Me
              <span class="ml-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                {{ ownedDocuments().length }}
              </span>
            </h2>
          </div>

          @if (ownedDocuments().length === 0) {
            <p class="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
              You haven't created or imported any documents yet.
            </p>
          } @else {
            <div class="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              @for (doc of ownedDocuments(); track doc.id) {
                <div class="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-blue-300 hover:shadow-md">
                  <div>
                    <div class="flex items-start justify-between gap-2">
                      <a
                        [routerLink]="['/documents', doc.id]"
                        class="text-base font-semibold text-slate-900 hover:text-blue-600 line-clamp-2"
                      >
                        {{ doc.title }}
                      </a>
                      <span class="shrink-0 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                        Owner
                      </span>
                    </div>

                    @if (doc.source_filename) {
                      <p class="mt-2 inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        Imported: {{ doc.source_filename }}
                      </p>
                    }

                    <p class="mt-2 text-xs text-slate-500">
                      Updated {{ doc.updated_at | date: 'MMM d, y, h:mm a' }}
                    </p>
                  </div>

                  <div class="mt-5 flex items-center justify-between border-t border-slate-100 pt-3.5">
                    <div class="flex items-center gap-2">
                      @if (doc.shares.length > 0) {
                        <div class="flex -space-x-1.5">
                          @for (share of doc.shares; track share.user_id) {
                            <span
                              [title]="share.name + ' (' + (share.role === 'editor' ? 'Can Edit' : 'View Only') + ')'"
                              class="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold text-white"
                              [style.backgroundColor]="share.avatar_color"
                            >
                              {{ share.name.charAt(0) }}
                            </span>
                          }
                        </div>
                        <span class="text-xs text-slate-500">
                          {{ doc.shares.length }} shared
                        </span>
                      } @else {
                        <span class="text-xs text-slate-400">Private</span>
                      }
                    </div>

                    <div class="flex items-center gap-1.5">
                      <button
                        type="button"
                        (click)="openShareModal(doc)"
                        class="rounded-lg px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      >
                        Share
                      </button>
                      <button
                        type="button"
                        (click)="requestDelete(doc)"
                        class="rounded-lg px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              }
            </div>
          }
        </section>

        <!-- Section B: Shared with Me -->
        <section class="mt-10">
          <div class="flex items-center justify-between">
            <h2 class="text-base font-semibold text-slate-900">
              Shared with Me
              <span class="ml-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                {{ sharedDocuments().length }}
              </span>
            </h2>
          </div>

          @if (sharedDocuments().length === 0) {
            <p class="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
              No documents have been shared with you yet.
            </p>
          } @else {
            <div class="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              @for (doc of sharedDocuments(); track doc.id) {
                <div class="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-blue-300 hover:shadow-md">
                  <div>
                    <div class="flex items-start justify-between gap-2">
                      <a
                        [routerLink]="['/documents', doc.id]"
                        class="text-base font-semibold text-slate-900 hover:text-blue-600 line-clamp-2"
                      >
                        {{ doc.title }}
                      </a>
                      <span
                        [class]="
                          doc.role === 'editor'
                            ? 'shrink-0 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700'
                            : 'shrink-0 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700'
                        "
                      >
                        {{ doc.role === 'editor' ? 'Can Edit' : 'View Only' }}
                      </span>
                    </div>

                    <div class="mt-2.5 flex items-center gap-2 text-xs text-slate-600">
                      <span
                        class="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                        [style.backgroundColor]="doc.owner_avatar_color"
                      >
                        {{ doc.owner_name.charAt(0) }}
                      </span>
                      <span>Owner: {{ doc.owner_name }}</span>
                    </div>

                    <p class="mt-2 text-xs text-slate-500">
                      Updated {{ doc.updated_at | date: 'MMM d, y, h:mm a' }}
                    </p>
                  </div>

                  <div class="mt-5 flex justify-end border-t border-slate-100 pt-3.5">
                    <a
                      [routerLink]="['/documents', doc.id]"
                      class="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                    >
                      {{ doc.role === 'editor' ? 'Open & Edit' : 'Open Read-Only' }}
                    </a>
                  </div>
                </div>
              }
            </div>
          }
        </section>
      }
    </div>

    <app-confirm-dialog
      [open]="docToDelete() !== null"
      [title]="'Delete ' + (docToDelete()?.title ?? 'document') + '?'"
      message="This action cannot be undone. Collaborators will immediately lose access."
      confirmLabel="Delete"
      cancelLabel="Cancel"
      [destructive]="true"
      (confirmed)="confirmDelete()"
      (cancelled)="docToDelete.set(null)"
    />

    <app-share-modal
      [open]="docToShare() !== null"
      [document]="docToShare()"
      (closed)="docToShare.set(null)"
      (updated)="refreshSharedModalDoc()"
    />
  `,
})
export class DashboardComponent {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  readonly identity = inject(IdentityService);

  readonly ownedDocuments = signal<DocumentSummary[]>([]);
  readonly sharedDocuments = signal<DocumentSummary[]>([]);
  readonly loading = signal<boolean>(true);
  readonly loadError = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);
  readonly creating = signal<boolean>(false);
  readonly uploading = signal<boolean>(false);

  readonly docToDelete = signal<DocumentSummary | null>(null);
  readonly docToShare = signal<DocumentSummary | null>(null);

  readonly isEmpty = computed(
    () => this.ownedDocuments().length === 0 && this.sharedDocuments().length === 0,
  );

  constructor() {
    effect(() => {
      const user = this.identity.currentUser();
      if (user) {
        void this.loadDocuments();
      }
    });
  }

  async loadDocuments(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    try {
      const res = await firstValueFrom(this.api.getDocuments());
      this.ownedDocuments.set(res.owned);
      this.sharedDocuments.set(res.shared);
      const sharingTarget = this.docToShare();
      if (sharingTarget) {
        const refreshed = res.owned.find((d) => d.id === sharingTarget.id) ?? null;
        this.docToShare.set(refreshed);
      }
    } catch {
      this.loadError.set('Unable to load documents. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  async createDocument(): Promise<void> {
    this.creating.set(true);
    this.actionError.set(null);
    try {
      const doc = await firstValueFrom(
        this.api.createDocument({ title: 'Untitled Document' }),
      );
      await this.router.navigate(['/documents', doc.id]);
    } catch (err) {
      this.actionError.set(this.extractError(err, 'Failed to create document.'));
    } finally {
      this.creating.set(false);
    }
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }

    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith('.txt') && !lowerName.endsWith('.md')) {
      this.actionError.set('Unsupported file format. Only .txt and .md files are supported.');
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      this.actionError.set('File is too large. Maximum supported size is 2 MB.');
      return;
    }

    this.uploading.set(true);
    this.actionError.set(null);
    try {
      const doc = await firstValueFrom(this.api.uploadDocument(file));
      await this.router.navigate(['/documents', doc.id]);
    } catch (err) {
      this.actionError.set(this.extractError(err, 'Upload failed. Please try again.'));
    } finally {
      this.uploading.set(false);
    }
  }

  requestDelete(doc: DocumentSummary): void {
    this.docToDelete.set(doc);
  }

  async confirmDelete(): Promise<void> {
    const doc = this.docToDelete();
    this.docToDelete.set(null);
    if (!doc) {
      return;
    }

    this.actionError.set(null);
    try {
      await firstValueFrom(this.api.deleteDocument(doc.id));
      this.ownedDocuments.update((docs) => docs.filter((d) => d.id !== doc.id));
    } catch (err) {
      this.actionError.set(this.extractError(err, 'Delete failed. Please try again.'));
    }
  }

  openShareModal(doc: DocumentSummary): void {
    this.docToShare.set(doc);
  }

  async refreshSharedModalDoc(): Promise<void> {
    await this.loadDocuments();
  }

  private extractError(err: unknown, fallback: string): string {
    if (err instanceof HttpErrorResponse && err.error?.detail) {
      return String(err.error.detail);
    }
    return fallback;
  }
}

