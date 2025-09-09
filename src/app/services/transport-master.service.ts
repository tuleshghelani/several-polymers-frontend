import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TransportMasterSearchRequest {
  search?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export interface TransportMaster {
  id?: number;
  name: string;
  mobile?: string;
  gst?: string;
  remarks?: string;
  status?: string;
}

@Injectable({ providedIn: 'root' })
export class TransportMasterService {
  private apiUrl = `${environment.apiUrl}/api/transports`;

  constructor(private http: HttpClient) {}

  create(transport: TransportMaster): Observable<any> {
    return this.http.post(this.apiUrl, transport);
  }

  update(transport: TransportMaster): Observable<any> {
    return this.http.put(this.apiUrl, transport);
  }

  delete(id: number): Observable<any> {
    return this.http.request('DELETE', this.apiUrl, { body: { id } });
  }

  getTransports(payload: { search?: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/getTransports`, payload || {});
  }

  search(payload: TransportMasterSearchRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/search`, payload);
  }

  details(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/details`, { id });
  }
}


