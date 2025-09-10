import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink, RouterModule } from '@angular/router';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';
import { SnackbarService } from '../../../shared/services/snackbar.service';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { BrandService, BrandSearchRequest } from '../../../services/brand.service';
import { EncryptionService } from '../../../shared/services/encryption.service';

@Component({
  selector: 'app-brand-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LoaderComponent,
    RouterLink,
    PaginationComponent
  ],
  templateUrl: './brand-list.component.html',
  styleUrls: ['./brand-list.component.scss']
})
export class BrandListComponent implements OnInit {
  searchForm!: FormGroup;
  isLoading = false;
  brands: any[] = [];
  currentPage = 0;
  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50, 100];
  totalPages = 0;
  totalElements = 0;
  startIndex = 0;
  endIndex = 0;

  constructor(
    private fb: FormBuilder,
    private service: BrandService,
    private snackbar: SnackbarService,
    private router: Router,
    private encryption: EncryptionService
  ) {
    this.searchForm = this.fb.group({
      search: ['']
    });
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    const payload: BrandSearchRequest = {
      search: this.searchForm.value.search || '',
      page: this.currentPage,
      size: this.pageSize,
      sortBy: 'id',
      sortDir: 'desc'
    };
    this.service.search(payload).subscribe({
      next: (response) => {
        if (response?.data?.content) {
          this.brands = response.data.content;
          this.totalPages = response.data.totalPages;
          this.totalElements = response.data.totalElements;
          this.updateIndexes();
        } else if (Array.isArray(response?.data)) {
          this.brands = response.data;
          this.totalPages = 1;
          this.totalElements = response.data.length;
          this.updateIndexes();
        } else {
          this.brands = [];
          this.totalPages = 0;
          this.totalElements = 0;
          this.updateIndexes();
        }
        this.isLoading = false;
      },
      error: () => {
        this.snackbar.error('Failed to load brands');
        this.isLoading = false;
      }
    });
  }

  onSearch(): void {
    this.currentPage = 0;
    this.pageSize = 10;
    this.loadData();
  }

  reset(): void {
    this.searchForm.reset();
    this.currentPage = 0;
    this.pageSize = 10;
    this.loadData();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadData();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 0;
    this.loadData();
  }

  delete(id: number): void {
    if (!confirm('Delete this brand?')) return;
    this.isLoading = true;
    this.service.delete(id).subscribe({
      next: () => {
        this.snackbar.success('Brand deleted');
        this.loadData();
      },
      error: () => {
        this.snackbar.error('Failed to delete brand');
        this.isLoading = false;
      }
    });
  }

  private updateIndexes(): void {
    this.startIndex = this.currentPage * this.pageSize;
    this.endIndex = Math.min(this.startIndex + this.pageSize, this.totalElements);
  }

  onEdit(id: number): void {
    const encrypted = this.encryption.encrypt(id);
    localStorage.setItem('brandId', encrypted);
    this.router.navigate(['/brand/edit']);
  }

  goToCreateBrand(): void {
    localStorage.removeItem('brandId');
    this.router.navigate(['/brand/create']);
  }
}


