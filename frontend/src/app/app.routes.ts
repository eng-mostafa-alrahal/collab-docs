import { Routes } from '@angular/router';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { EditorComponent } from './features/editor/editor.component';

export const routes: Routes = [
  { path: '', component: DashboardComponent, title: 'Ajaia Docs — Dashboard' },
  { path: 'documents/:id', component: EditorComponent, title: 'Ajaia Docs — Editor' },
  { path: '**', redirectTo: '' },
];
