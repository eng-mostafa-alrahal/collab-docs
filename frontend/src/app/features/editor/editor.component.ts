import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, computed, effect, inject, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Editor, NgxEditorComponent, NgxEditorMenuComponent, Toolbar } from 'ngx-editor';
import { Subject, concatMap, debounceTime, firstValueFrom, from, takeUntil } from 'rxjs';
import { DocumentDetail } from '../../core/models/document.model';
import { ApiService } from '../../core/services/api.service';
import { IdentityService } from '../../core/services/identity.service';
import { downloadMarkdownFile } from '../../shared/utilities/markdown-export';
import { ShareModalComponent } from '../sharing/share-modal.component';

type SaveState = 'loading' | 'idle' | 'dirty' | 'saving' | 'saved' | 'error' | 'conflict';

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    NgxEditorComponent,
    NgxEditorMenuComponent,
    ShareModalComponent,
  ],
  template: `
    <div class="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <!-- Top Bar (hidden on print) -->
      <div class="print:hidden mb-4 flex flex-wrap items-center justify-between gap-3">
        <a
          routerLink="/"
          class="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-200/60 hover:text-slate-900"
        >
          <span>← Dashboard</span>
        </a>

        @if (document(); as doc) {
          <div class="flex flex-wrap items-center gap-2">
            <!-- Save status -->
            @if (canEdit()) {
              <div class="mr-2 flex items-center gap-2 text-xs font-medium">
                @switch (saveState()) {
                  @case ('dirty') {
                    <span class="text-amber-600">Unsaved changes</span>
                  }
                  @case ('saving') {
                    <span class="text-blue-600">Saving...</span>
                  }
                  @case ('saved') {
                    <span class="text-emerald-600">All changes saved</span>
                  }
                  @case ('error') {
                    <span class="text-red-600">Save failed</span>
                    <button
                      type="button"
                      (click)="triggerManualSave()"
                      class="rounded-md bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 hover:bg-red-200"
                    >
                      Retry
                    </button>
                  }
                  @case ('conflict') {
                    <span class="text-red-600">Version conflict</span>
                    <button
                      type="button"
                      (click)="reloadDocument()"
                      class="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 hover:bg-amber-200"
                    >
                      Reload Latest
                    </button>
                  }
                }
              </div>
            }

            <button
              type="button"
              (click)="exportMarkdown()"
              class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Export .md
            </button>
            <button
              type="button"
              (click)="exportPdf()"
              class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Print / PDF
            </button>
            <button
              type="button"
              (click)="shareModalOpen.set(true)"
              class="rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
            >
              Share
            </button>
          </div>
        }
      </div>

      @if (loading()) {
        <div class="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-24">
          <div class="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p class="mt-3 text-sm font-medium text-slate-600">Loading document...</p>
        </div>
      } @else if (accessError(); as err) {
        <div class="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-xs">
          <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-lg font-bold text-red-600">
            !
          </div>
          <h2 class="mt-4 text-lg font-semibold text-slate-900">{{ err.title }}</h2>
          <p class="mt-1 text-sm text-slate-600">{{ err.message }}</p>
          <div class="mt-6 flex justify-center gap-3">
            <a
              routerLink="/"
              class="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Back to Dashboard
            </a>
            @if (err.retryable) {
              <button
                type="button"
                (click)="reloadDocument()"
                class="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Retry
              </button>
            }
          </div>
        </div>
      } @else if (document(); as doc) {
        <!-- Conflict / Rename Error Banners -->
        @if (saveState() === 'conflict') {
          <div class="print:hidden mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <span>
              This document was updated elsewhere (stale version). Reload to load the latest content before saving new edits.
            </span>
            <button
              type="button"
              (click)="reloadDocument()"
              class="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
            >
              Reload Document
            </button>
          </div>
        }

        @if (renameError()) {
          <div class="print:hidden mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            {{ renameError() }}
          </div>
        }

        <!-- Document Title & Role Header -->
        <div class="mb-4 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-xs print:border-none print:px-0 print:py-0 print:shadow-none">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="min-w-0 flex-1">
              @if (isOwner()) {
                <input
                  type="text"
                  [(ngModel)]="titleDraft"
                  (blur)="commitTitleRename()"
                  (keydown.enter)="$any($event.target).blur()"
                  maxlength="255"
                  aria-label="Document title"
                  class="w-full rounded-lg border border-transparent bg-transparent px-1 py-0.5 text-2xl font-bold tracking-tight text-slate-900 transition hover:border-slate-200 focus:border-blue-500 focus:bg-slate-50 focus:outline-none print:px-0"
                />
              } @else {
                <h1 class="text-2xl font-bold tracking-tight text-slate-900">
                  {{ doc.title }}
                </h1>
              }

              <div class="print:hidden mt-1.5 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span>Owner: {{ doc.owner_name }}</span>
                <span>•</span>
                <span>Updated {{ doc.updated_at | date: 'MMM d, y, h:mm a' }}</span>
                @if (doc.source_filename) {
                  <span>•</span>
                  <span class="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">
                    Source: {{ doc.source_filename }}
                  </span>
                }
              </div>
            </div>

            <div class="print:hidden flex items-center gap-2">
              @switch (doc.role) {
                @case ('owner') {
                  <span class="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">
                    Owner
                  </span>
                }
                @case ('editor') {
                  <span class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                    Can Edit
                  </span>
                }
                @case ('viewer') {
                  <span class="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
                    View Only
                  </span>
                }
              }
            </div>
          </div>
        </div>

        <!-- Rich-Text Editor -->
        <div class="NgxEditor__Wrapper">
          @if (canEdit()) {
            <ngx-editor-menu [editor]="editor" [toolbar]="toolbar" />
          }
          <ngx-editor
            [editor]="editor"
            [formControl]="contentControl"
            [outputFormat]="'html'"
            [placeholder]="canEdit() ? 'Start writing your document here...' : ''"
          />
        </div>
      }
    </div>

    <app-share-modal
      [open]="shareModalOpen()"
      [document]="document()"
      (closed)="shareModalOpen.set(false)"
      (updated)="reloadDocument()"
    />
  `,
})
export class EditorComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  readonly identity = inject(IdentityService);

  readonly editor = new Editor();
  readonly toolbar: Toolbar = [
    ['bold', 'italic', 'underline'],
    [{ heading: ['paragraph', 'h1', 'h2', 'h3'] }],
    ['bullet_list', 'ordered_list'],
    ['blockquote', 'code'],
    ['link'],
    ['undo', 'redo'],
  ];

  readonly contentControl = new FormControl<string>('', { nonNullable: true });
  readonly document = signal<DocumentDetail | null>(null);
  readonly loading = signal<boolean>(true);
  readonly saveState = signal<SaveState>('idle');
  readonly renameError = signal<string | null>(null);
  readonly shareModalOpen = signal<boolean>(false);
  readonly accessError = signal<{
    title: string;
    message: string;
    retryable: boolean;
  } | null>(null);

  titleDraft = '';

  readonly isOwner = computed(() => this.document()?.role === 'owner');
  readonly canEdit = computed(() => {
    const role = this.document()?.role;
    return role === 'owner' || role === 'editor';
  });

  private readonly destroy$ = new Subject<void>();
  private readonly saveTrigger$ = new Subject<void>();
  private readonly documentId = signal<number | null>(null);
  private editRevision = 0;

  constructor() {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const id = Number(params.get('id'));
      if (!Number.isInteger(id) || id <= 0) {
        this.documentId.set(null);
        this.loading.set(false);
        this.accessError.set({
          title: 'Document not found',
          message: 'The requested document ID is invalid.',
          retryable: false,
        });
        return;
      }
      this.documentId.set(id);
    });

    this.contentControl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      if (!this.canEdit() || this.loading()) {
        return;
      }
      this.editRevision += 1;
      this.saveState.set('dirty');
      this.identity.setUnsavedChanges(true);
      this.saveTrigger$.next();
    });

    this.saveTrigger$
      .pipe(
        debounceTime(900),
        concatMap(() => from(this.persistContent())),
        takeUntil(this.destroy$),
      )
      .subscribe();

    effect(() => {
      const id = this.documentId();
      const user = this.identity.currentUser();
      if (id !== null && user !== null) {
        void this.loadDocument(id);
      }
    });
  }

  ngOnDestroy(): void {
    this.identity.setUnsavedChanges(false);
    this.destroy$.next();
    this.destroy$.complete();
    this.editor.destroy();
  }

  async reloadDocument(): Promise<void> {
    const id = this.documentId();
    if (id !== null) {
      await this.loadDocument(id);
    }
  }

  async triggerManualSave(): Promise<void> {
    await this.persistContent();
  }

  async commitTitleRename(): Promise<void> {
    const doc = this.document();
    if (!doc || !this.isOwner()) {
      return;
    }
    const trimmed = this.titleDraft.trim();
    if (!trimmed) {
      this.titleDraft = doc.title;
      this.renameError.set('Document title cannot be empty.');
      return;
    }
    if (trimmed === doc.title) {
      this.renameError.set(null);
      return;
    }

    this.renameError.set(null);
    try {
      const updated = await firstValueFrom(
        this.api.renameDocument(doc.id, { title: trimmed }),
      );
      this.document.update((current) =>
        current
          ? { ...current, title: updated.title, updated_at: updated.updated_at }
          : updated,
      );
      this.titleDraft = updated.title;
    } catch (err) {
      this.titleDraft = doc.title;
      this.renameError.set(
        err instanceof HttpErrorResponse && err.error?.detail
          ? String(err.error.detail)
          : 'Failed to rename document.',
      );
    }
  }

  exportMarkdown(): void {
    const doc = this.document();
    if (!doc) {
      return;
    }
    downloadMarkdownFile(doc.title, this.contentControl.value);
  }

  exportPdf(): void {
    window.print();
  }

  private async loadDocument(id: number): Promise<void> {
    this.loading.set(true);
    this.accessError.set(null);
    this.renameError.set(null);
    this.identity.setUnsavedChanges(false);

    try {
      const doc = await firstValueFrom(this.api.getDocument(id));
      this.document.set(doc);
      this.titleDraft = doc.title;
      this.editRevision = 0;

      if (doc.role === 'viewer') {
        this.contentControl.disable({ emitEvent: false });
      } else {
        this.contentControl.enable({ emitEvent: false });
      }
      this.contentControl.setValue(doc.content_html, { emitEvent: false });
      this.saveState.set('saved');
    } catch (err) {
      this.document.set(null);
      if (err instanceof HttpErrorResponse) {
        if (err.status === 403) {
          this.accessError.set({
            title: 'Access denied',
            message: 'You do not have permission to view this document with the current account.',
            retryable: false,
          });
        } else if (err.status === 404) {
          this.accessError.set({
            title: 'Document not found',
            message: 'This document may have been deleted or does not exist.',
            retryable: false,
          });
        } else {
          this.accessError.set({
            title: 'Unable to load document',
            message: 'An error occurred while loading this document.',
            retryable: true,
          });
        }
      } else {
        this.accessError.set({
          title: 'Unable to load document',
          message: 'Could not reach the backend server.',
          retryable: true,
        });
      }
    } finally {
      this.loading.set(false);
    }
  }

  private async persistContent(): Promise<void> {
    const doc = this.document();
    if (!doc || !this.canEdit()) {
      return;
    }

    const revisionAtStart = this.editRevision;
    const htmlPayload = this.contentControl.value;
    this.saveState.set('saving');

    try {
      const updated = await firstValueFrom(
        this.api.saveDocumentContent(doc.id, {
          content_html: htmlPayload,
          version: doc.version,
        }),
      );
      this.document.update((current) =>
        current
          ? {
              ...current,
              version: updated.version,
              updated_at: updated.updated_at,
            }
          : updated,
      );

      if (this.editRevision === revisionAtStart) {
        this.saveState.set('saved');
        this.identity.setUnsavedChanges(false);
      } else {
        this.saveState.set('dirty');
      }
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 409) {
        this.saveState.set('conflict');
      } else {
        this.saveState.set('error');
      }
    }
  }
}

