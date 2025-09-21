import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { SearchableSelectComponent } from '../../../shared/components/searchable-select/searchable-select.component';
import { ConfirmModalComponent } from '../../../shared/components/confirm-modal/confirm-modal.component';
import { SnackbarService } from '../../../shared/services/snackbar.service';
import { EmployeeWithdrawService } from '../../../services/employee-withdraw.service';
import { EmployeeService } from '../../../services/employee.service';
import { AttendanceService } from '../../../services/attendance.service';
import { EmployeeWithdrawSearchItem } from '../../../models/employee-withdraw.model';

@Component({
  selector: 'app-withdraw-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LoaderComponent,
    PaginationComponent,
    SearchableSelectComponent,
    ConfirmModalComponent
  ],
  templateUrl: './withdraw-list.component.html',
  styleUrls: ['./withdraw-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WithdrawListComponent implements OnInit {
  searchForm!: FormGroup;
  isLoading = false;
  isLoadingEmployees = false;
  employees: any[] = [];
  withdraws: EmployeeWithdrawSearchItem[] = [];

  // Pagination
  currentPage = 0;
  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50, 100];
  totalPages = 0;
  totalElements = 0;
  startIndex = 0;
  endIndex = 0;

  // Delete modal
  showDeleteModal = false;
  selectedIdToDelete: number | null = null;

  constructor(
    private fb: FormBuilder,
    private withdrawService: EmployeeWithdrawService,
    private employeeService: EmployeeService,
    private attendanceService: AttendanceService,
    private snackbar: SnackbarService,
    private router: Router
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadEmployees();
    this.loadWithdraws();
  }

  private initializeForm(): void {
    this.searchForm = this.fb.group({
      employeeId: [''],
      search: [''],
      startDate: [''],
      endDate: ['']
    });
  }

  private updatePaginationIndexes(): void {
    const start = this.currentPage * this.pageSize;
    const end = start + this.pageSize;
    this.startIndex = Math.min(start, this.totalElements);
    this.endIndex = Math.min(end, this.totalElements);
  }

  loadEmployees(): void {
    this.isLoadingEmployees = true;
    this.employeeService.getAllEmployees().subscribe({
      next: (res) => {
        if (res.success) {
          this.employees = res.data || res.content || [];
        }
        this.isLoadingEmployees = false;
      },
      error: () => {
        this.isLoadingEmployees = false;
      }
    });
  }

  refreshEmployees(): void {
    this.isLoadingEmployees = true;
    this.employeeService.refreshEmployees().subscribe({
      next: (res) => {
        if (res.success) {
          this.employees = res.data || res.content || [];
        }
        this.isLoadingEmployees = false;
      },
      error: () => {
        this.isLoadingEmployees = false;
      }
    });
  }

  loadWithdraws(): void {
    this.isLoading = true;
    console.log('🔄 Starting loadWithdraws - isLoading set to true');
    
    const params = {
      ...this.searchForm.value,
      currentPage: this.currentPage,
      perPageRecord: this.pageSize,
      startDate: this.searchForm.value.startDate ? this.formatDateForBackend(this.searchForm.value.startDate) : null,
      endDate: this.searchForm.value.endDate ? this.formatDateForBackend(this.searchForm.value.endDate) : null
    };
    
    console.log('📊 Loading withdraws with params:', params);
    
    this.withdrawService.search(params).subscribe({
      next: (res) => {
        console.log('✅ Withdraw search response received:', res);
        
        // Always stop loading first
        this.isLoading = false;
        console.log('🔄 Response received - isLoading set to false');
        
        // Handle response data
        if (res && res.success && res.data) {
          this.withdraws = res.data.content || [];
          this.totalPages = res.data.totalPages || 0;
          this.totalElements = res.data.totalElements || 0;
          console.log('✅ Data processed successfully:', {
            withdrawsCount: this.withdraws.length,
            totalPages: this.totalPages,
            totalElements: this.totalElements
          });
        } else {
          console.warn('⚠️ Unexpected response structure:', res);
          this.withdraws = [];
          this.totalPages = 0;
          this.totalElements = 0;
        }
        
        this.updatePaginationIndexes();
      },
      error: (error) => {
        console.error('❌ Withdraw search error:', error);
        this.isLoading = false;
        console.log('🔄 Error occurred - isLoading set to false');
        
        this.snackbar.error(`Failed to fetch withdraws: ${error.status} - ${error.statusText}`);
        this.withdraws = [];
        this.totalPages = 0;
        this.totalElements = 0;
        this.updatePaginationIndexes();
      }      
    });
  }

  private formatDateForBackend(dateString: string): string {
    if (!dateString) return '';
    // Convert yyyy-MM-dd to dd-MM-yyyy for backend
    const parts = dateString.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateString;
  }

  onSearch(): void {
    this.currentPage = 0;
    this.pageSize = 10;
    this.loadWithdraws();
  }

  resetForm(): void {
    this.searchForm.reset({ employeeId: '', search: '', startDate: null, endDate: null });
    this.onSearch();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadWithdraws();
  }

  onPageSizeChange(newSize: number): void {
    this.pageSize = newSize;
    this.currentPage = 0;
    this.loadWithdraws();
  }

  addWithdraw(): void {
    this.router.navigate(['/employee-withdraw/create']);
  }

  // Debug method to check loader state
  checkLoaderState(): void {
    console.log('🔍 Current loader state:', {
      isLoading: this.isLoading,
      withdrawsCount: this.withdraws.length,
      totalPages: this.totalPages,
      totalElements: this.totalElements
    });
    this.snackbar.info(`Loader: ${this.isLoading ? 'Loading' : 'Stopped'} | Records: ${this.withdraws.length}`);
  }

  // Emergency method to force stop loader
  forceStopLoader(): void {
    console.log('🛑 Force stopping loader');
    this.isLoading = false;
    this.snackbar.success('Loader force stopped');
  }


  editWithdraw(id: number): void {
    this.router.navigate(['/employee-withdraw/edit', id]);
  }

  deleteWithdraw(id: number): void {
    this.selectedIdToDelete = id;
    this.showDeleteModal = true;
  }

  onDeleteConfirm(): void {
    if (this.selectedIdToDelete == null) return;
    const id = this.selectedIdToDelete;
    this.showDeleteModal = false;
    this.isLoading = true;
    this.withdrawService.delete(id).subscribe({
      next: (res) => {
        if (res.success) {
          this.snackbar.success(res.message);
          this.loadWithdraws();
        }
        this.isLoading = false;
      },
      error: () => {
        this.snackbar.error('Failed to delete withdraw');
        this.isLoading = false;
      }
    });
  }

  onDeleteCancel(): void {
    this.showDeleteModal = false;
    this.selectedIdToDelete = null;
  }

  trackByWithdraw = (_: number, item: EmployeeWithdrawSearchItem) => item.id;

  downloadPayrollSummary(): void {
    // Check if dates are selected in the form
    if (!this.searchForm.get('startDate')?.value) {
      this.snackbar.error('Please select start date');
      return;
    }

    if (!this.searchForm.get('endDate')?.value) {
      this.snackbar.error('Please select end date');
      return;
    }

    this.isLoading = true;
    const params = {
      startDate: this.formatDateForApi(this.searchForm.get('startDate')?.value),
      endDate: this.formatDateForApi(this.searchForm.get('endDate')?.value)
    };

    this.attendanceService.generatePayrollSummaryPdf(params).subscribe({
      next: (response) => {
        const url = window.URL.createObjectURL(response.blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = response.filename;
        link.click();
        window.URL.revokeObjectURL(url);
        this.isLoading = false;
      },
      error: (error) => {
        this.snackbar.error('Failed to download payroll summary');
        this.isLoading = false;
      }
    });
  }

  private formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatDateForApi(dateStr: string): string {
    const date = new Date(dateStr);
    return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
  }
}


