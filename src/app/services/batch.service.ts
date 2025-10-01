import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { BatchFullDetailsResponse, BatchUpsertRequest, MachineListResponse } from '../models/batch.model';

@Injectable({ providedIn: 'root' })
export class BatchService {
  private apiUrl = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  getFullDetails(id: number): Observable<BatchFullDetailsResponse> {
    return this.http.post<BatchFullDetailsResponse>(`${this.apiUrl}/api/bachs/full-details`, { id });
  }

  upsert(request: BatchUpsertRequest): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/api/bachs/upsert`, request);
  }

  getMachines(): Observable<MachineListResponse> {
    return this.http.get<MachineListResponse>(`${this.apiUrl}/api/machines/list`);
  }
}


