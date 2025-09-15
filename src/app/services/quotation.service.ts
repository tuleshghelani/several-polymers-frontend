import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { QuotationResponse } from '../models/quotation.model';
import { CreateQuotationRequest } from '../models/quotation.model';
import { QuotationItemSearchApiResponse, QuotationItemSearchRequest } from '../models/quotation.model';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class QuotationService {
  private apiUrl = `${environment.apiUrl}/api/quotations`;
  private quotationItemUrl = `${environment.apiUrl}/api/quotation-items`;

  constructor(private http: HttpClient) { }

  createQuotation(quotation: CreateQuotationRequest): Observable<QuotationResponse> {
    return this.http.post<QuotationResponse>(`${this.apiUrl}/create`, quotation);
  }

  updateQuotation(id: number, data: any): Observable<any> {
    data.quotationId = id;
    return this.http.put<any>(`${this.apiUrl}/update`, data);
  }

  searchQuotations(params: any): Observable<QuotationResponse> {
    return this.http.post<QuotationResponse>(`${this.apiUrl}/search`, params);
  }

  searchQuotationItems(payload: QuotationItemSearchRequest): Observable<QuotationItemSearchApiResponse> {
    return this.http.post<QuotationItemSearchApiResponse>(`${this.quotationItemUrl}/search`, payload);
  }

  deleteQuotation(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/delete`, { quotationId:id });
  }

  generatePdf(id: number): Observable<{ blob: Blob; filename: string }> {
    return this.http.post(`${this.apiUrl}/generate-pdf`, { id }, {
      responseType: 'blob',
      observe: 'response'
    }).pipe(
      map(response => {
        const contentDisposition = response.headers.get('Content-Disposition');
        const filename = contentDisposition?.split('filename=')[1]?.replace(/"/g, '') || 'quotation.pdf';
        const blob = new Blob([response.body!], { type: 'application/pdf' });
        return { blob, filename };
      })
    );
  }

  generateDispatchPdf(id: number): Observable<{ blob: Blob; filename: string }> {
    return this.http.post(`${this.apiUrl}/generate-dispatch-slip`, { id }, {
      responseType: 'blob',
      observe: 'response'
    }).pipe(
      map(response => {
        const contentDisposition = response.headers.get('Content-Disposition');
        const filename = contentDisposition?.split('filename=')[1]?.replace(/"/g, '') || 'dispatch-slip.pdf';
        const blob = new Blob([response.body!], { type: 'application/pdf' });
        return { blob, filename };
      })
    );
  }

  updateQuotationStatus(id: number, status: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/update-status`, { id, status });
  }

  getQuotationDetail(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/detail`, { id }).pipe(
      map(response => {
        if (response && response.data) {
          return {
            success: true,
            data: response.data
          };
        }
        return {
          success: false,
          message: 'Invalid response format'
        };
      })
    );
  }

  updateQuotationItemProductionStatus(quotationItemId: number, isProduction: boolean): Observable<any> {
    return this.http.put<any>(`${this.quotationItemUrl}/production`, { id: quotationItemId, isProduction });
  }

  updateQuotationItemStatus(quotationItemId: number, quotationItemStatus: string): Observable<any> {
    return this.http.put<any>(`${this.quotationItemUrl}/status`, { id: quotationItemId, quotationItemStatus });
  }

  updateQuotationItemCreatedRoll(quotationItemId: number, createdRoll: number): Observable<any> {
    return this.http.put<any>(`${this.quotationItemUrl}/created-roll`, { id: quotationItemId, createdRoll });
  }
}
