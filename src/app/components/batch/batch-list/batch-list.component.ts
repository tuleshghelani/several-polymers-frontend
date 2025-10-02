import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { SearchableSelectComponent } from '../../../shared/components/searchable-select/searchable-select.component';
import { BatchService } from '../../../services/batch.service';
import { BatchListItem, BatchSearchRequest } from '../../../models/batch.model';
import { SnackbarService } from '../../../shared/services/snackbar.service';
import { UrlEncryptionService } from '../../../shared/services/url-encryption.service';
import { EncryptionService } from '../../../shared/services/encryption.service';

@Component({
  selector: 'app-batch-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    FormsModule,
    LoaderComponent,
    PaginationComponent,
    SearchableSelectComponent
  ],
  templateUrl: './batch-list.component.html',
  styleUrls: ['./batch-list.component.scss']
})
export class BatchListComponent implements OnInit {
  searchForm!: FormGroup;
  isLoading = false;
  batches: BatchListItem[] = [];

  // Pagination properties
  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;
  startIndex = 0;
  endIndex = 0;
  pageSizeOptions = [5, 10, 25, 50, 100];

  machines: Array<{ id: number; name: string }> = [];
  shifts = [
    { label: 'Day', value: 'D' },
    { label: 'Night', value: 'N' }
  ];

  constructor(
    private fb: FormBuilder,
    private batchService: BatchService,
    private snackbar: SnackbarService,
    private router: Router,
    private urlEncryptionService: UrlEncryptionService,
    private encryptionService: EncryptionService
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadMachines();
    this.loadBatches();
  }

  private initializeForm(): void {
    this.searchForm = this.fb.group({
      startDate: [''],
      endDate: [''],
      shift: [''],
      machineId: [null]
    });
  }

  loadMachines(): void {
    this.batchService.getMachines().subscribe({
      next: (res) => {
        if (res.success) {
          this.machines = res.data.map(m => ({ id: m.id, name: m.name }));
        }
      },
      error: () => {}
    });
  }

  loadBatches(): void {
    this.isLoading = true;
    const form = this.searchForm.value;
    const req: BatchSearchRequest = {
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      shift: form.shift || undefined,
      machineId: (form.machineId !== null && form.machineId !== undefined) ? form.machineId : undefined,
      page: this.currentPage,
      size: this.pageSize,
      sortBy: 'id',
      sortDir: 'desc'
    };
    
    this.batchService.searchBatches(req).subscribe({
      next: (res) => {
        if (res.success) {
          this.batches = res.data.content;
          this.totalElements = res.data.totalRecords;
          this.totalPages = Math.ceil(this.totalElements / this.pageSize);
          this.startIndex = this.currentPage * this.pageSize;
          this.endIndex = Math.min((this.currentPage + 1) * this.pageSize, this.totalElements);
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.snackbar.error(error?.message || 'Failed to load batches');
        this.isLoading = false;
      }
    });
  }

  onSearch(): void {
    this.currentPage = 0;
    console.log('Form values on search:', this.searchForm.value);
    this.loadBatches();
  }

  resetForm(): void {
    this.searchForm.reset({
      startDate: '',
      endDate: '',
      shift: '',
      machineId: null
    });
    this.currentPage = 0;
    this.pageSize = 10;
    this.loadBatches();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadBatches();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 0;
    this.loadBatches();
  }

  getMachineName(machineId: number): string {
    const m = this.machines.find(x => x.id === machineId);
    return m ? m.name : String(machineId ?? '');
  }

  getShiftLabel(shiftValue: string): string {
    const shift = this.shifts.find(s => s.value === shiftValue);
    return shift ? shift.label : shiftValue;
  }

  editBatch(id: number): void {
    try {
      // Store encrypted ID in localStorage (similar to quotation pattern)
      const encryptedIdForStorage = this.encryptionService.encrypt(id.toString());
      localStorage.setItem('editBatchId', encryptedIdForStorage);
      
      // Also use encrypted URL parameter
      const encryptedId = this.urlEncryptionService.encryptId(id);
      if (encryptedId) {
        this.router.navigate(['/batch/edit', encryptedId]);
      } else {
        // Fallback to /batch/add route if URL encryption fails
        this.router.navigate(['/batch/add']);
      }
    } catch (error) {
      console.error('Error encrypting batch ID:', error);
      this.snackbar.error('Failed to navigate to edit page');
    }
  }

  viewBatch(id: number): void {
    // For now, redirect to edit page since there's no dedicated view component
    this.editBatch(id);
  }

  deleteBatch(id: number, batchName: string): void {
    const confirmMessage = `Are you sure you want to delete batch "${batchName}"? This action cannot be undone.`;
    
    if (confirm(confirmMessage)) {
      this.isLoading = true;
      this.batchService.deleteBatch(id).subscribe({
        next: (response) => {
          this.snackbar.success('Batch deleted successfully');
          this.loadBatches(); // Refresh the list
        },
        error: (error) => {
          console.error('Error deleting batch:', error);
          this.snackbar.error(error?.message || 'Failed to delete batch');
          this.isLoading = false;
        }
      });
    }
  }

  // Track by function for ngFor performance optimization
  trackByBatchId(index: number, batch: BatchListItem): number {
    return batch.id;
  }

  // Navigate to create new batch and clear any stored edit data
  createNewBatch(): void {
    // Clear any stored encrypted batch ID to ensure clean slate for new batch
    localStorage.removeItem('editBatchId');
    
    // Navigate to add batch route
    this.router.navigate(['/batch/add']);
  }

  // Get end index for pagination display
  getEndIndex(): number {
    return Math.min(this.endIndex, this.totalElements);
  }
}


