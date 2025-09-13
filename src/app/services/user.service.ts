import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { 
  User, 
  UserResponse, 
  UserSearchRequest, 
  UserCreateRequest, 
  UserUpdateRequest, 
  PasswordUpdateRequest, 
  UserDetailResponse 
} from '../models/user.model';
import { EncryptionService } from '../shared/services/encryption.service';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = `${environment.apiUrl}/api/users`;
  private readonly CACHE_KEY = 'active_users';

  constructor(
    private http: HttpClient,
    private encryptionService: EncryptionService
  ) {}

  createUser(user: UserCreateRequest): Observable<any> {
    return this.http.post(this.apiUrl, user);
  }

  updateUser(user: UserUpdateRequest): Observable<any> {
    return this.http.put(this.apiUrl, user);
  }

  updatePassword(passwordData: PasswordUpdateRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/update-password`, passwordData);
  }

  searchUsers(params: UserSearchRequest): Observable<UserResponse> {
    return this.http.post<UserResponse>(`${this.apiUrl}/search`, params);
  }

  getUserById(id: number): Observable<UserDetailResponse> {
    return this.http.post<UserDetailResponse>(`${this.apiUrl}/getById`, { id });
  }

  deleteUser(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/delete`, { id });
  }

  getAllUsers(): Observable<UserResponse> {
    const cachedData = this.getCachedUsers();
    if (cachedData) {
      return of(cachedData);
    }

    return this.http.get<UserResponse>(`${this.apiUrl}/all`).pipe(
      tap(response => {
        if (response.success) {
          this.cacheUsers(response);
        }
      })
    );
  }

  getActiveUsers(): Observable<UserResponse> {
    const cachedData = this.getCachedUsers();
    if (cachedData) {
      return of(cachedData);
    }

    return this.http.post<UserResponse>(`${this.apiUrl}/search`, {
      status: 'A',
      page: 0,
      size: 1000
    }).pipe(
      tap(response => {
        if (response.success) {
          this.cacheUsers(response);
        }
      })
    );
  }

  private getCachedUsers(): UserResponse | null {
    const encryptedData = localStorage.getItem(this.CACHE_KEY);
    if (encryptedData) {
      const decryptedData = this.encryptionService.decrypt(encryptedData);
      if (decryptedData) {
        return decryptedData;
      }
    }
    return null;
  }

  private cacheUsers(data: UserResponse): void {
    const encryptedData = this.encryptionService.encrypt(data);
    localStorage.setItem(this.CACHE_KEY, encryptedData);
  }

  refreshUsers(): Observable<UserResponse> {
    localStorage.removeItem(this.CACHE_KEY);
    return this.getActiveUsers();
  }

  getAvailableRoles(): string[] {
    return ['ADMIN', 'SALES_AND_MARKETING', 'DISPATCH', 'OPERATOR', 'HR', 'REPORTER'];
  }

  getStatusOptions(): { value: string; label: string }[] {
    return [
      { value: 'A', label: 'Active' },
      { value: 'I', label: 'Inactive' }
    ];
  }
}
