import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Machine } from '../../../models/machine.model';
import { MachineService } from '../../../services/machine.service';
import { SnackbarService } from '../../../shared/services/snackbar.service';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-machine-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    FormsModule,
    LoaderComponent,
    RouterLink,
    PaginationComponent
  ],
  templateUrl: './machine-list.component.html',
  styleUrls: ['./machine-list.component.scss']
})
export class MachineListComponent implements OnInit {
  machines: Machine[] = [];
  searchForm!: FormGroup;
  isLoading = false;

  currentPage = 0;
  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50, 100];
  totalPages = 0;
  totalElements = 0;
  startIndex = 0;
  endIndex = 0;

  constructor(
    private machineService: MachineService,
    private fb: FormBuilder,
    private snackbar: SnackbarService
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadMachines();
  }

  private initializeForm(): void {
    this.searchForm = this.fb.group({
      search: ['']
    });
  }

  loadMachines(): void {
    this.isLoading = true;
    const params = {
      ...this.searchForm.value,
      page: this.currentPage,
      size: this.pageSize
    };

    this.machineService.searchMachines(params).subscribe({
      next: (response) => {
        if (response.success) {
          this.machines = response.data.content;
          this.totalPages = response.data.totalPages;
          this.totalElements = response.data.totalElements;
          this.updatePaginationIndexes();
        }
        this.isLoading = false;
      },
      error: () => {
        this.snackbar.error('Failed to load machines');
        this.isLoading = false;
      }
    });
  }

  onSearch(): void {
    this.currentPage = 0;
    this.pageSize = 10;
    this.loadMachines();
  }

  resetForm(): void {
    this.searchForm.reset();
    this.currentPage = 0;
    this.pageSize = 10;
    this.loadMachines();
  }

  onPageSizeChange(newSize: number): void {
    this.pageSize = newSize;
    this.currentPage = 0;
    this.loadMachines();
  }

  deleteMachine(id: number): void {
    if (confirm('Are you sure you want to delete this machine?')) {
      this.isLoading = true;
      this.machineService.deleteMachine(id).subscribe({
        next: (response) => {
          if (response.success) {
            this.snackbar.success('Machine deleted successfully');
            this.loadMachines();
          }
        },
        error: (error) => {
          this.snackbar.error(error?.error?.message || 'Failed to delete machine');
          this.isLoading = false;
        }
      });
    }
  }

  onPageChange(page: number): void {
    if (page >= 0 && page < this.totalPages) {
      this.currentPage = page;
      this.loadMachines();
    }
  }

  private updatePaginationIndexes(): void {
    this.startIndex = this.currentPage * this.pageSize;
    this.endIndex = Math.min(this.startIndex + this.pageSize, this.totalElements);
  }
}


