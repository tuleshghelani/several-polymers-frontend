import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  EmployeeWithdrawSearchRequest,
  EmployeeWithdrawSearchResponse,
  EmployeeWithdrawCreateRequest,
  EmployeeWithdrawUpdateRequest,
  EmployeeWithdrawDetailRequest,
  EmployeeWithdrawDetailResponse,
  ApiBaseResponse
} from '../models/employee-withdraw.model';

@Injectable({
  providedIn: 'root'
})
export class EmployeeWithdrawService {
  private apiUrl = `${environment.apiUrl}/api/employee-withdraws`;

  constructor(private http: HttpClient) {}

  search(params: EmployeeWithdrawSearchRequest): Observable<EmployeeWithdrawSearchResponse> {
    return this.http.post<EmployeeWithdrawSearchResponse>(`${this.apiUrl}/search`, params);
  }

  create(body: EmployeeWithdrawCreateRequest): Observable<ApiBaseResponse> {
    return this.http.post<ApiBaseResponse>(`${this.apiUrl}/create`, body);
  }

  update(body: EmployeeWithdrawUpdateRequest): Observable<ApiBaseResponse> {
    return this.http.put<ApiBaseResponse>(`${this.apiUrl}/`, body);
  }

  delete(id: number): Observable<ApiBaseResponse> {
    return this.http.request<ApiBaseResponse>('delete', `${this.apiUrl}/`, { body: { id } });
  }

  detail(id: number): Observable<EmployeeWithdrawDetailResponse> {
    const body: EmployeeWithdrawDetailRequest = { id };
    return this.http.post<EmployeeWithdrawDetailResponse>(`${this.apiUrl}/detail`, body);
  }
}


