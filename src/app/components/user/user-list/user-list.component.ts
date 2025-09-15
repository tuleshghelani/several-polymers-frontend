import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { User, UserSearchRequest } from '../../../models/user.model';
import { UserService } from '../../../services/user.service';
import { FormsModule } from '@angular/forms';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';
import { SnackbarService } from '../../../shared/services/snackbar.service';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    FormsModule,
    LoaderComponent,
    RouterLink,
    RouterModule,
    PaginationComponent
  ],
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss']
})
export class UserListComponent implements OnInit {
  users: User[] = [];
  searchForm!: FormGroup;
  isLoading = false;
  
  // Pagination properties
  currentPage = 0;
  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50, 100];
  totalPages = 0;
  totalElements = 0;
  startIndex = 0;
  endIndex = 0;

  constructor(
    private userService: UserService,
    private fb: FormBuilder,
    private snackbar: SnackbarService
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  private initializeForm(): void {
    this.searchForm = this.fb.group({
      searchTerm: [''],
      status: ['']
    });
  }
  loadUsers(): void {
    this.isLoading = true;
    const params: UserSearchRequest = {
      searchTerm: this.searchForm.get('searchTerm')?.value || '',
      status: this.searchForm.get('status')?.value || '',
      page: this.currentPage,
      size: this.pageSize
    };

    this.userService.searchUsers(params).subscribe({
      next: (response) => {
        console.log('API Response:', response);
        if (response.success) {
          // Map the API response to match our User model
          this.users = response.data.content.map((user: any) => ({
            ...user,
            roles: this.parseRoles(user.roles)
          }));
          this.totalPages = response.data.totalPages;
          this.totalElements = response.data.totalElements;
          this.updatePaginationIndexes();
          console.log('Mapped users:', this.users);
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.snackbar.error('Failed to load users');
        this.isLoading = false;
      }
    });
  }

  onSearch(): void {
    this.currentPage = 0;
    this.pageSize = 10;
    this.loadUsers();
  }

  resetForm(): void {
    this.searchForm.reset();
    this.currentPage = 0;
    this.pageSize = 10;
    this.loadUsers();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadUsers();
  }
  
  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 0;
    this.loadUsers();
  }

  private updatePaginationIndexes(): void {
    this.startIndex = this.currentPage * this.pageSize + 1;
    this.endIndex = Math.min((this.currentPage + 1) * this.pageSize, this.totalElements);
  }

  deleteUser(id: number): void {
    if (confirm('Are you sure you want to delete this user?')) {
      this.userService.deleteUser(id).subscribe({
        next: (response) => {
          if (response.success) {
            this.snackbar.success('User deleted successfully');
            this.loadUsers();
          } else {
            this.snackbar.error(response.message || 'Failed to delete user');
          }
        },
        error: () => {
          this.snackbar.error('Failed to delete user');
        }
      });
    }
  }
  
  getRolesDisplay(roles: string[]): string {
    return roles.join(', ');
  }
  
  getStatusClass(status: string): string {
    return status === 'A' ? 'active' : 'inactive';
  }
  
  getStatusLabel(status: string): string {
    return status === 'A' ? 'Active' : 'Inactive';
  }

  private parseRoles(roles: string | string[]): string[] {
    if (Array.isArray(roles)) {
      return roles;
    }
    
    if (typeof roles === 'string') {
      try {
        // Parse the JSON string
        const parsed = JSON.parse(roles);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch (error) {
        console.error('Error parsing roles:', error);
        return [roles]; // Return as single item array if parsing fails
      }
    }
    
    return [];
  }

  

  openWhatsApp(rawNumber: string | number | null | undefined): void {
    const digits = String(rawNumber ?? '').replace(/\D/g, '');
    if (!digits) {
      return;
    }
    const normalized = digits.length === 10 ? `91${digits}` : digits;
    const url = `whatsapp://send?phone=${normalized}`;
    try {
      // Attempt to open native WhatsApp app via custom protocol
      window.location.href = url;
    } catch {
      // Swallow errors; native handlers may block exceptions
    }
  }

}
