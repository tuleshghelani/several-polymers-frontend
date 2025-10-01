import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Machine, MachineDetailResponse, MachineSearchRequest, MachineSearchResponse } from '../models/machine.model';

@Injectable({
  providedIn: 'root'
})
export class MachineService {
  private apiUrl = `${environment.apiUrl}/api/machines`;

  constructor(private http: HttpClient) {}

  searchMachines(params: MachineSearchRequest): Observable<MachineSearchResponse> {
    return this.http.post<MachineSearchResponse>(`${this.apiUrl}/search`, params);
  }

  createMachine(payload: Partial<Machine>): Observable<any> {
    return this.http.post(this.apiUrl, payload);
  }

  updateMachine(id: number, payload: Partial<Machine>): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, payload);
  }

  deleteMachine(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  getMachineDetail(id: number): Observable<MachineDetailResponse> {
    return this.http.get<MachineDetailResponse>(`${this.apiUrl}/${id}`);
  }

  getAllMachines(): Observable<{ success: boolean; data: Machine[] }> {
    return this.http.get<{ success: boolean; data: Machine[] }>(`${this.apiUrl}/list`);
  }
}


