import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { EncryptionService } from '../shared/services/encryption.service';
import { Router } from '@angular/router';

interface TokenResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    refreshToken: string;
  };
}

export enum UserRole {
  ADMIN = 'ADMIN',
  DISPATCH = 'DISPATCH',
  SALES_AND_MARKETING = 'SALES_AND_MARKETING',
  OPERATOR = 'OPERATOR',
  HR = 'HR',
  REPORTER = 'REPORTER'
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private authStateSubject = new BehaviorSubject<boolean>(this.isAuthenticated());
  authState$ = this.authStateSubject.asObservable();
  private refreshTokenInProgress = false;

  constructor(
    private http: HttpClient,
    private encryptionService: EncryptionService,
    private router: Router
  ) {}

  login(credentials: { email: string; password: string }): Observable<any> {
    return this.http.post(`${environment.apiUrl}/api/auth/login`, credentials).pipe(
      tap((response: any) => {
        // Store token
        localStorage.setItem('token', response.accessToken);
        
        // Store user info
        localStorage.setItem('user', JSON.stringify({
          firstName: response.firstName,
          lastName: response.lastName,
          email: response.email,
          id: response.id
        }));
        
        // Encrypt and store roles
        const encryptedRoles = this.encryptionService.encrypt(response.role);
        localStorage.setItem('userRoles', encryptedRoles);
        
        // Encrypt and store refresh token
        const encryptedRefreshToken = this.encryptionService.encrypt(response.refreshToken);
        localStorage.setItem('refreshToken', encryptedRefreshToken);
        
        this.authStateSubject.next(true);
      })
    );
  }

  refreshToken(): Observable<TokenResponse> {
    if (this.refreshTokenInProgress) {
      return throwError(() => new Error('Refresh token request in progress'));
    }

    this.refreshTokenInProgress = true;
    const encryptedRefreshToken = localStorage.getItem('refreshToken');
    
    if (!encryptedRefreshToken) {
      this.handleAuthError();
      return throwError(() => new Error('No refresh token available'));
    }

    const refreshToken = this.encryptionService.decrypt(encryptedRefreshToken);

    return this.http.post<TokenResponse>(
      `${environment.apiUrl}/api/refresh-token/new`,
      { refreshToken },
      { headers: {} }
    ).pipe(
      tap(response => {
        if (response.success) {
          localStorage.setItem('token', response.data.token);
          const encryptedNewRefreshToken = this.encryptionService.encrypt(response.data.refreshToken);
          localStorage.setItem('refreshToken', encryptedNewRefreshToken);
        }
        this.refreshTokenInProgress = false;
      }),
      catchError(error => {
        this.refreshTokenInProgress = false;
        if (error.status === 400) {
          this.handleAuthError();
        }
        return throwError(() => error);
      })
    );
  }

  private handleAuthError(): void {
    this.logout();
    this.router.navigate(['/login']).then(() => {
      window.location.reload();
    });
  }

  logout(): void {
    localStorage.clear();
    this.authStateSubject.next(false);
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getUserRoles(): string[] {
    const encryptedRoles = localStorage.getItem('userRoles');
    if (!encryptedRoles) return [];
    
    try {
      const roles = this.encryptionService.decrypt(encryptedRoles);
      return Array.isArray(roles) ? roles : [];
    } catch (error) {
      console.error('Error decrypting roles:', error);
      return [];
    }
  }

  hasRole(role: string): boolean {
    const userRoles = this.getUserRoles();
    return userRoles.includes(role);
  }

  hasAnyRole(roles: string[]): boolean {
    const userRoles = this.getUserRoles();
    return roles.some(role => userRoles.includes(role));
  }

  // Role-specific methods
  isAdmin(): boolean {
    return this.hasRole(UserRole.ADMIN);
  }

  isSalesAndMarketing(): boolean {
    return this.hasRole(UserRole.SALES_AND_MARKETING);
  }

  isHR(): boolean {
    return this.hasRole(UserRole.HR);
  }

  isDispatch(): boolean {
    return this.hasRole(UserRole.DISPATCH);
  }

  isOperator(): boolean {
    return this.hasRole(UserRole.OPERATOR);
  }

  isReporter(): boolean {
    return this.hasRole(UserRole.REPORTER);
  }

  // Permission methods
  canAccessMasterMenu(): boolean {
    return this.hasAnyRole([UserRole.ADMIN, UserRole.SALES_AND_MARKETING, UserRole.DISPATCH]);
  }

  canAccessTransactionMenu(): boolean {
    return this.hasAnyRole([UserRole.ADMIN, UserRole.SALES_AND_MARKETING, UserRole.DISPATCH]);
  }

  canAccessEmployeeMenu(): boolean {
    return this.hasAnyRole([UserRole.ADMIN, UserRole.HR]);
  }

  canAccessEmployeeOrder(): boolean {
    return this.hasAnyRole([UserRole.ADMIN, UserRole.HR]);
  }

  canAccessQuotation(): boolean {
    return this.hasAnyRole([UserRole.ADMIN, UserRole.SALES_AND_MARKETING, UserRole.DISPATCH]);
  }

  canCreateSale(): boolean {
    return this.hasRole(UserRole.ADMIN);
  }

  getUserInfo(): any {
    const userInfo = localStorage.getItem('user');
    return userInfo ? JSON.parse(userInfo) : null;
  }

  getDefaultRoute(): string {
    const userRoles = this.getUserRoles();
    
    if (userRoles.includes(UserRole.ADMIN)) {
      return '/category';
    } else if (userRoles.includes(UserRole.SALES_AND_MARKETING)) {
      return '/category';
    } else if (userRoles.includes(UserRole.HR)) {
      return '/employee';
    } else if (userRoles.includes(UserRole.DISPATCH)) {
      return '/category';
    } else {
      return '/login'; // For OPERATOR and REPORTER who have no access yet
    }
  }
}