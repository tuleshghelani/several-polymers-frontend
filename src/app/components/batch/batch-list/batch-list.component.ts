import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
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

  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  pageSizeOptions = [5, 10, 25, 50, 100];

  machines: Array<{ id: number; name: string }> = [];
  shifts = [
    { label: 'Shift A', value: 'A' },
    { label: 'Shift B', value: 'B' },
    { label: 'Shift C', value: 'C' }
  ];

  constructor(
    private fb: FormBuilder,
    private batchService: BatchService,
    private snackbar: SnackbarService
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadMachines();
    this.loadBatches();
  }

  private initializeForm(): void {
    const today = new Date();
    const iso = today.toISOString().slice(0, 10);
    this.searchForm = this.fb.group({
      date: [iso],
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
      date: form.date || undefined,
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
          this.pageSize = res.data.pageSize;
        }
        this.isLoading = false;
      },
      error: () => {
        this.snackbar.error('Failed to load batches');
        this.isLoading = false;
      }
    });
  }

  onSearch(): void {
    this.currentPage = 0;
    this.loadBatches();
  }

  resetForm(): void {
    const today = new Date().toISOString().slice(0, 10);
    this.searchForm.reset({ date: today, shift: '', machineId: null });
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
}


