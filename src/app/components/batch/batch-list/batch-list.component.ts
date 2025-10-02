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
    private router: Router
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
      machineId: form.machineId || undefined,
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
    this.router.navigate(['/batch/add'], { queryParams: { id } });
  }

  viewBatch(id: number): void {
    this.router.navigate(['/batch/view', id]);
  }
}


