import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { QuotationService } from '../../../services/quotation.service';
import { QuotationItemSearchResultItem, QuotationItemStatus, QuotationStatus } from '../../../models/quotation.model';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';
import { SnackbarService } from '../../../shared/services/snackbar.service';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { SearchableSelectComponent } from '../../../shared/components/searchable-select/searchable-select.component';
import { Brand, BrandService } from '../../../services/brand.service';
import { AuthService } from '../../../services/auth.service';
import { takeUntil } from 'rxjs';

@Component({
  selector: 'app-employee-order-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule,
    LoaderComponent,
    SearchableSelectComponent,
    PaginationComponent
  ],
  templateUrl: './employee-order-list.component.html',
  styleUrls: ['./employee-order-list.component.scss']
})
export class EmployeeOrderListComponent implements OnInit {
  quotationItems: QuotationItemSearchResultItem[] = [];
  brands: Brand[] = [];
  searchForm!: FormGroup;
  isLoadingQuotationItems = false;
  isLoadingBrands = false;
  quotationItemStatuses: any[] = [];  
  statusOptions: any[] = [];
  private lastStatusByIndex: Record<number, string> = {};
  
  // Quotation items pagination
  qiCurrentPage = 0;
  qiPageSize = 10;
  pageSizeOptions = [5, 10, 25, 50, 100];
  qiTotalPages = 0;
  qiTotalElements = 0;

  constructor(
    private quotationService: QuotationService,
    private brandService: BrandService,
    private authService: AuthService,
    private fb: FormBuilder,
    private snackbar: SnackbarService
  ) {
    this.initializeForm();
    this.statusOptions = Object.entries(QuotationItemStatus).map(([key, value]) => ({ label: value, value: key }));
  }

  ngOnInit(): void {
    this.loadBrands();
    this.loadQuotationItems();
    this.loadQuotationItemStatuses();
  }

  get isOperator(): boolean {
    return this.authService.isOperator();
  }

  private initializeForm(): void {
    this.searchForm = this.fb.group({
      isProduction: [true],
      quotationItemStatuses: [['O', 'I']],
      brandId: [null],
    });
  }

  loadQuotationItemStatuses(): void {
    const statuses = Object.entries(QuotationItemStatus).map(([key, value]) => ({ label: value, value: key }));
    this.quotationItemStatuses = statuses;
  }

  loadQuotationItems(): void {
    this.isLoadingQuotationItems = true;
    const formValues = this.searchForm.value;
    const payload = {
      isProduction: true,
      quotationItemStatuses: Array.isArray(formValues.quotationItemStatuses) && formValues.quotationItemStatuses.length > 0 ? formValues.quotationItemStatuses : ['O', 'I'],
      brandId: formValues.brandId === '' || formValues.brandId === null ? undefined : formValues.brandId,
      page: this.qiCurrentPage,
      size: this.qiPageSize
    };
    this.quotationService.searchQuotationItems(payload).subscribe({
      next: (response) => {
        const isOk = (response as any)?.status === 'success' || (response as any)?.success === true;
        if (isOk && (response as any)?.data) {
          const data = (response as any).data;
          this.quotationItems = Array.isArray(data?.content) ? data.content : [];
          this.qiTotalPages = typeof data?.totalPages === 'number' ? data.totalPages : 0;
          this.qiTotalElements = typeof data?.totalElements === 'number' ? data.totalElements : this.quotationItems.length;
        } else {
          this.quotationItems = [];
          this.qiTotalPages = 0;
          this.qiTotalElements = 0;
        }
        this.isLoadingQuotationItems = false;
      },
      error: (error) => {
        this.snackbar.error(error?.error?.message || 'Failed to load quotation items');
        this.isLoadingQuotationItems = false;
      }
    });
  }

  // Map code to human-readable label; hide billed from employee order list
  getItemStatusLabel(statusCode: string | undefined | null): string {
    if (!statusCode) return '';
    if (statusCode === 'B') return '';
    const map: Record<string, string> = {
      O: QuotationItemStatus.O,
      I: QuotationItemStatus.I,
      C: QuotationItemStatus.C,
    } as unknown as Record<string, string>;
    return map[statusCode] || String(statusCode);
  }

  // Allowed forward-only transitions, excluding billed
  getAvailableItemStatusOptions(currentStatus: string | undefined | null): Array<{ label: string; value: string }> {
    if (!currentStatus) return [];
    switch (currentStatus) {
      case 'O':
        return [
          { label: QuotationItemStatus.O, value: 'O' },
          { label: QuotationItemStatus.I, value: 'I' },
          { label: QuotationItemStatus.C, value: 'C' }
        ];
      case 'I':
        return [          
          { label: QuotationItemStatus.I, value: 'I' },
          { label: QuotationItemStatus.C, value: 'C' }
        ];
      case 'C':
      case 'B':
      default:
        return [];
    }
  }

  onItemStatusFocus(index: number): void {
    const current = this.quotationItems[index]?.quotationItemStatus;
    if (current) {
      this.lastStatusByIndex[index] = current;
    }
  }

  onItemStatusChange(index: number, newStatus: string): void {
    const item = this.quotationItems[index];
    if (!item || item.id == null) return;
    const previousStatus = this.lastStatusByIndex[index] ?? item.quotationItemStatus;

    if (previousStatus === newStatus) {
      return;
    }

    const isInvalidTransition =
      (previousStatus === 'I' && newStatus === 'O') ||
      (previousStatus === 'C' && (newStatus === 'O' || newStatus === 'I')) ||
      (previousStatus === 'B');

    if (isInvalidTransition) {
      this.snackbar.error('Invalid transition. Status can only move forward.');
      this.quotationItems[index].quotationItemStatus = previousStatus;
      this.loadQuotationItems();
      return;
    }

    this.quotationService.updateQuotationItemStatus(item.id, newStatus).subscribe({
      next: (res: any) => {
        if (res?.success) {
          this.quotationItems[index].quotationItemStatus = newStatus;
          this.lastStatusByIndex[index] = newStatus;
          this.loadQuotationItems();
          this.snackbar.success('Status updated successfully');
        } else {
          this.snackbar.error(res?.message || 'Failed to update status');
          this.quotationItems[index].quotationItemStatus = previousStatus;
          this.loadQuotationItems();
        }
      },
      error: (err) => {
        this.quotationItems[index].quotationItemStatus = previousStatus;
        this.loadQuotationItems();
        this.snackbar.error(err?.error?.message || 'Failed to update status');
      }
    });
  }

  loadBrands(): void {
    this.isLoadingBrands = true;
    this.brandService.getBrands({ status: 'A' }).subscribe({
      next: (res: any) => {
        if (res?.success && Array.isArray(res.data)) {
          this.brands = res.data;
        } else if (res?.success && Array.isArray(res.data?.content)) {
          this.brands = res.data.content;
        } else {
          this.brands = [];
        }
        this.isLoadingBrands = false;
      },
      error: () => {
        this.isLoadingBrands = false;
      }
    });
  }

  refreshBrands(): void {
    this.isLoadingBrands = true;
    this.brandService.refreshBrands().subscribe({
      next: (res: any) => {
        if (res?.success && Array.isArray(res.data)) {
          this.brands = res.data;
        } else if (res?.success && Array.isArray(res.data?.content)) {
          this.brands = res.data.content;
        } else {
          this.brands = [];
        }
        this.isLoadingBrands = false;
      },
      error: () => {
        this.isLoadingBrands = false;
      }
    });
  }

  onStatusFocus(index: number): void {
    const current = this.quotationItems[index]?.quotationItemStatus;
    if (current) {
      this.lastStatusByIndex[index] = current;
    }
  }

  onSearch(): void {
    this.qiCurrentPage = 0;
    this.loadQuotationItems();
  }

  resetForm(): void {
    this.searchForm.patchValue({
      isProduction: true,
      quotationItemStatuses: ['O'],
      brandId: null,
      sortBy: 'id',
      sortDir: 'desc'
    });
    this.qiCurrentPage = 0;
    this.loadQuotationItems();
  }

  // Quotation items pagination handlers
  onQiPageChange(page: number): void {
    this.qiCurrentPage = page;
    this.loadQuotationItems();
  }

  onQiPageSizeChange(newSize: number): void {
    this.qiPageSize = newSize;
    this.qiCurrentPage = 0;
    this.loadQuotationItems();
  }
} 