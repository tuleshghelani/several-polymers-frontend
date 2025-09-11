import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { EncryptionService } from '../shared/services/encryption.service';

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
  private readonly CACHE_KEY = 'active_brands';

  constructor(private http: HttpClient, private encryptionService: EncryptionService) {}

  create(brand: Brand): Observable<any> {
    return this.http.post(this.apiUrl, brand);
  }

  update(brand: Brand): Observable<any> {
    return this.http.put(this.apiUrl, brand);
  }

  delete(id: number): Observable<any> {
    return this.http.request('DELETE', this.apiUrl, { body: { id } });
  }

  getBrands(params: any): Observable<any> {
    if (params?.status === 'A') {
      const encryptedData = localStorage.getItem(this.CACHE_KEY);
      if (encryptedData) {
        const decryptedData = this.encryptionService.decrypt(encryptedData);
        if (decryptedData) {
          return of(decryptedData);
        }
      }
    }

    return this.http.post<any>(`${this.apiUrl}/getBrands`, {
      search: params?.search
    }).pipe(
      tap(response => {
        if (params?.status === 'A' && response?.success) {
          const encryptedData = this.encryptionService.encrypt(response);
          localStorage.setItem(this.CACHE_KEY, encryptedData);
        }
      })
    );
  }

  refreshBrands(): Observable<any> {
    localStorage.removeItem(this.CACHE_KEY);
    return this.getBrands({ status: 'A' });
  }

  search(payload: BrandSearchRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/search`, payload);
  }

  details(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/details`, { id });
  }
}


