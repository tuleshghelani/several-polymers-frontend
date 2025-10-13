import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { 
  EnquiryUpsertRequest, 
  EnquiryUpsertResponse, 
  EnquirySearchRequest, 
  EnquirySearchResponse, 
  EnquiryListRequest, 
  EnquiryListResponse, 
  EnquiryDetailsResponse, 
  EnquiryDeleteResponse 
} from '../models/enquiry.model';

@Injectable({ providedIn: 'root' })
export class EnquiryService {
  private apiUrl = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  // Create new enquiry
  createEnquiry(request: EnquiryUpsertRequest): Observable<EnquiryUpsertResponse> {
    return this.http.post<EnquiryUpsertResponse>(`${this.apiUrl}/api/enquiries/create`, request);
  }

  // Update enquiry (with ID in body)
  updateEnquiry(request: EnquiryUpsertRequest): Observable<EnquiryUpsertResponse> {
    return this.http.put<EnquiryUpsertResponse>(`${this.apiUrl}/api/enquiries/update`, request);
  }

  // Update enquiry (with ID in path)
  updateEnquiryById(id: number, request: Omit<EnquiryUpsertRequest, 'id'>): Observable<EnquiryUpsertResponse> {
    return this.http.put<EnquiryUpsertResponse>(`${this.apiUrl}/api/enquiries/${id}`, request);
  }

  // Delete enquiry (with ID in body)
  deleteEnquiry(id: number): Observable<EnquiryDeleteResponse> {
    return this.http.post<EnquiryDeleteResponse>(`${this.apiUrl}/api/enquiries/delete`, { 
      body: { id } 
    });
  }

  // Delete enquiry (with ID in path)
  deleteEnquiryById(id: number): Observable<EnquiryDeleteResponse> {
    return this.http.delete<EnquiryDeleteResponse>(`${this.apiUrl}/api/enquiries/${id}`);
  }

  // Get enquiries with pagination
  getEnquiries(request: EnquiryListRequest): Observable<EnquiryListResponse> {
    return this.http.post<EnquiryListResponse>(`${this.apiUrl}/api/enquiries/getEnquiries`, request);
  }

  // Search enquiries
  searchEnquiries(request: EnquirySearchRequest): Observable<EnquirySearchResponse> {
    return this.http.post<EnquirySearchResponse>(`${this.apiUrl}/api/enquiries/search`, request);
  }

  // Get enquiry details (with ID in body)
  getEnquiryDetails(id: number): Observable<EnquiryDetailsResponse> {
    return this.http.post<EnquiryDetailsResponse>(`${this.apiUrl}/api/enquiries/details`, { id });
  }

  // Get enquiry details (with ID in path)
  getEnquiryDetailsById(id: number): Observable<EnquiryDetailsResponse> {
    return this.http.get<EnquiryDetailsResponse>(`${this.apiUrl}/api/enquiries/${id}`);
  }
}
