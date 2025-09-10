import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface BrandSearchRequest {
  search?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export interface Brand {
  id?: number;
  name: string;
  remarks?: string;
  status?: string;
}

@Injectable({ providedIn: 'root' })
export class BrandService {
  private apiUrl = `${environment.apiUrl}/api/brands`;

  constructor(private http: HttpClient) {}

  create(brand: Brand): Observable<any> {
    return this.http.post(this.apiUrl, brand);
  }

  update(brand: Brand): Observable<any> {
    return this.http.put(this.apiUrl, brand);
  }

  delete(id: number): Observable<any> {
    return this.http.request('DELETE', this.apiUrl, { body: { id } });
  }

  getBrands(payload: { search?: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/getBrands`, payload || {});
  }

  search(payload: BrandSearchRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/search`, payload);
  }

  details(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/details`, { id });
  }
}


