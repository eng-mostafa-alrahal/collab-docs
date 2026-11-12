import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  DocumentContentUpdateRequest,
  DocumentCreateRequest,
  DocumentDetail,
  DocumentListResponse,
  DocumentRenameRequest,
} from '../models/document.model';
import { ShareInfo, ShareRequest } from '../models/sharing.model';
import { User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.baseUrl}/users`);
  }

  getDocuments(): Observable<DocumentListResponse> {
    return this.http.get<DocumentListResponse>(`${this.baseUrl}/documents`);
  }

  getDocument(id: number): Observable<DocumentDetail> {
    return this.http.get<DocumentDetail>(`${this.baseUrl}/documents/${id}`);
  }

  createDocument(payload: DocumentCreateRequest): Observable<DocumentDetail> {
    return this.http.post<DocumentDetail>(`${this.baseUrl}/documents`, payload);
  }

  renameDocument(id: number, payload: DocumentRenameRequest): Observable<DocumentDetail> {
    return this.http.patch<DocumentDetail>(`${this.baseUrl}/documents/${id}`, payload);
  }

  saveDocumentContent(
    id: number,
    payload: DocumentContentUpdateRequest,
  ): Observable<DocumentDetail> {
    return this.http.put<DocumentDetail>(`${this.baseUrl}/documents/${id}/content`, payload);
  }

  deleteDocument(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/documents/${id}`);
  }

  uploadDocument(file: File): Observable<DocumentDetail> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<DocumentDetail>(`${this.baseUrl}/documents/import`, formData);
  }

  shareDocument(id: number, payload: ShareRequest): Observable<ShareInfo> {
    return this.http.post<ShareInfo>(`${this.baseUrl}/documents/${id}/shares`, payload);
  }

  revokeAccess(id: number, userId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/documents/${id}/shares/${userId}`);
  }
}

