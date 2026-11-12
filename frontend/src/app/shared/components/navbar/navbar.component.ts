import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { User } from '../../../core/models/user.model';
import { IdentityService } from '../../../core/services/identity.service';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, ConfirmDialogComponent],
  template: `
    <header class="print:hidden sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-xs">
      <div class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div class="flex items-center gap-6">
          <a routerLink="/" class="flex items-center gap-2.5 text-slate-900 no-underline">
            <span
              class="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white shadow-xs"
            >
              A
            </span>
            <div>
              <span class="text-base font-semibold tracking-tight text-slate-900">Ajaia Docs</span>
              <span class="hidden sm:inline-block ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                Demo Mode
              </span>
            </div>
          </a>

          <nav class="flex items-center gap-1">
            <a
              routerLink="/"
              routerLinkActive="bg-slate-100 text-slate-900"
              [routerLinkActiveOptions]="{ exact: true }"
              class="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            >
              Dashboard
            </a>
          </nav>
        </div>

        <div class="flex items-center gap-3">
          @if (identity.currentUser(); as current) {
            <div class="flex items-center gap-2">
              <span class="hidden md:inline text-xs font-medium text-slate-500">Switch user:</span>
              <div class="flex items-center rounded-xl bg-slate-100 p-1">
                @for (user of identity.users(); track user.id) {
                  <button
                    type="button"
                    (click)="onSelectUser(user)"
                    [attr.aria-pressed]="current.id === user.id"
                    [class]="
                      current.id === user.id
                        ? 'flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-slate-900 shadow-xs ring-1 ring-slate-200/80'
                        : 'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900'
                    "
                  >
                    <span
                      class="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                      [style.backgroundColor]="user.avatar_color"
                    >
                      {{ user.name.charAt(0) }}
                    </span>
                    <span>{{ firstName(user.name) }}</span>
                  </button>
                }
              </div>
            </div>
          } @else if (identity.loading()) {
            <span class="text-xs text-slate-500">Loading accounts...</span>
          }
        </div>
      </div>
    </header>

    <app-confirm-dialog
      [open]="pendingUser() !== null"
      title="Discard unsaved changes?"
      message="You have unsaved edits in the current document. Switching accounts now will discard unsaved changes."
      confirmLabel="Switch Account"
      cancelLabel="Stay Here"
      [destructive]="true"
      (confirmed)="confirmUserSwitch()"
      (cancelled)="cancelUserSwitch()"
    />
  `,
})
export class NavbarComponent {
  private readonly router = inject(Router);
  readonly identity = inject(IdentityService);
  readonly pendingUser = signal<User | null>(null);

  firstName(fullName: string): string {
    return fullName.split(' ')[0] ?? fullName;
  }

  onSelectUser(user: User): void {
    const current = this.identity.currentUser();
    if (current && current.id === user.id) {
      return;
    }
    if (this.identity.hasUnsavedChanges()) {
      this.pendingUser.set(user);
      return;
    }
    void this.applyUserSwitch(user);
  }

  confirmUserSwitch(): void {
    const user = this.pendingUser();
    this.pendingUser.set(null);
    if (user) {
      void this.applyUserSwitch(user);
    }
  }

  cancelUserSwitch(): void {
    this.pendingUser.set(null);
  }

  private async applyUserSwitch(user: User): Promise<void> {
    this.identity.setUnsavedChanges(false);
    if (this.router.url !== '/') {
      await this.router.navigate(['/']);
    }
    this.identity.switchUser(user);
  }
}

