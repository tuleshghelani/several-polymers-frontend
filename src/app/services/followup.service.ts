import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { FollowUp, FollowUpListResponse, FollowUpRequest, FollowUpResponse, FollowUpSearchRequest, FollowUpSearchResponse } from '../models/followup.model';

@Injectable({
  providedIn: 'root'
})
export class FollowUpService {
  private apiUrl = `${environment.apiUrl}/api/follow-ups`;

  constructor(private http: HttpClient) { }

  // Get all followups for an enquiry
  getFollowUps(enquiryId: number): Observable<FollowUpListResponse> {
    return this.http.post<FollowUpListResponse>(`${this.apiUrl}/by-enquiry`, { enquiryId });
  }

  // Create a new followup
  createFollowUp(followUp: FollowUpRequest): Observable<FollowUpResponse> {
    return this.http.post<FollowUpResponse>(`${this.apiUrl}/create`, followUp);
  }

  // Update an existing followup
  updateFollowUp(id: number, followUp: FollowUpRequest): Observable<FollowUpResponse> {
    followUp.id = id;
    return this.http.put<FollowUpResponse>(`${this.apiUrl}/update`, followUp);
  }

  // Delete a followup
  deleteFollowUp(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/delete`, { id });
  }

  // Search followups with pagination
  searchFollowUps(searchRequest: FollowUpSearchRequest): Observable<FollowUpSearchResponse> {
    return this.http.post<FollowUpSearchResponse>(`${this.apiUrl}/search`, searchRequest);
  }
}