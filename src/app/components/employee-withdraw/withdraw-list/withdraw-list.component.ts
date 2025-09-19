import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink, RouterModule } from '@angular/router';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { SearchableSelectComponent } from '../../../shared/components/searchable-select/searchable-select.component';
import { ConfirmModalComponent } from '../../../shared/components/confirm-modal/confirm-modal.component';
import { SnackbarService } from '../../../shared/services/snackbar.service';
import { EmployeeWithdrawService } from '../../../services/employee-withdraw.service';
import { EmployeeService } from '../../../services/employee.service';
import { EmployeeWithdrawSearchItem } from '../../../models/employee-withdraw.model';

@Component({
  selector: 'app-withdraw-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    RouterLink,
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
    private snackbar: SnackbarService
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
      search: ['']
    });
  }

  private updatePaginationIndexes(): void {
    const start = this.currentPage * this.pageSize;
    const end = start + this.pageSize;
    this.startIndex = Math.min(start, this.totalElements);
    this.endIndex = Math.min(end, this.totalElements);
  }

  loadEmployees(): void {
    this.employeeService.getAllEmployees().subscribe({
      next: (res) => {
        if (res.success) {
          this.employees = res.data || res.content || [];
        }
      },
      error: () => {}
    });
  }

  refreshEmployees(): void {
    this.employeeService.refreshEmployees().subscribe({
      next: (res) => {
        if (res.success) {
          this.employees = res.data || res.content || [];
        }
      },
      error: () => {}
    });
  }

  loadWithdraws(): void {
    this.isLoading = true;
    const params = {
      ...this.searchForm.value,
      currentPage: this.currentPage,
      perPageRecord: this.pageSize
    };
    this.withdrawService.search(params).subscribe({
      next: (res) => {
        if (res.success) {
          this.withdraws = res.data.content;
          this.totalPages = res.data.totalPages;
          this.totalElements = res.data.totalElements;
          this.updatePaginationIndexes();
        }
        this.isLoading = false;
      },
      error: () => {
        this.snackbar.error('Failed to fetch withdraws');
        this.isLoading = false;
      }
    });
  }

  onSearch(): void {
    this.currentPage = 0;
    this.pageSize = 10;
    this.loadWithdraws();
  }

  resetForm(): void {
    this.searchForm.reset({ employeeId: '', search: '' });
    this.onSearch();
  }

  loadPage(page: number): void {
    this.currentPage = page;
    this.loadWithdraws();
  }

  changePageSize(size: number): void {
    this.pageSize = size;
    this.currentPage = 0;
    this.loadWithdraws();
  }

  confirmDelete(id: number): void {
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
}


