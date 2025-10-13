import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { EnquiryService } from '../../../services/enquiry.service';
import { EnquiryListItem, EnquirySearchRequest } from '../../../models/enquiry.model';
import { SnackbarService } from '../../../shared/services/snackbar.service';
import { UrlEncryptionService } from '../../../shared/services/url-encryption.service';

@Component({
  selector: 'app-enquiry-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    FormsModule,
    LoaderComponent,
    PaginationComponent
  ],
  templateUrl: './enquiry-list.component.html',
  styleUrls: ['./enquiry-list.component.scss']
})
export class EnquiryListComponent implements OnInit {
  searchForm!: FormGroup;
  isLoading = false;
  enquiries: EnquiryListItem[] = [];

  // Pagination properties
  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;
  startIndex = 0;
  endIndex = 0;
  pageSizeOptions = [5, 10, 25, 50, 100];

  // Status and type options for filtering
  statusOptions = [
    { label: 'All Status', value: '' },
    { label: 'Pending', value: 'P' },
    { label: 'Win', value: 'W' },
    { label: 'Loss', value: 'L' }
  ];

  typeOptions = [
    { label: 'All Types', value: '' },
    { label: 'Individual', value: 'Individual' },
    { label: 'Corporate', value: 'Corporate' }
  ];

  constructor(
    private fb: FormBuilder,
    private enquiryService: EnquiryService,
    private snackbar: SnackbarService,
    private router: Router,
    private urlEncryptionService: UrlEncryptionService
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadEnquiries();
  }

  private initializeForm(): void {
    this.searchForm = this.fb.group({
      search: [''],
      status: [''],
      type: [''],
      startDate: [''],
      endDate: ['']
    });
  }

  loadEnquiries(): void {
    this.isLoading = true;
    const form = this.searchForm.value;
    const req: EnquirySearchRequest = {
      search: form.search || undefined,
      status: form.status || undefined,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      page: this.currentPage,
      size: this.pageSize,
      sortBy: 'id',
      sortDir: 'desc'
    };
    
    this.enquiryService.searchEnquiries(req).subscribe({
      next: (res) => {
        if (res.success) {
          this.enquiries = res.data.content;
          this.totalElements = res.data.totalElements;
          this.totalPages = res.data.totalPages;
          this.startIndex = this.currentPage * this.pageSize;
          this.endIndex = Math.min((this.currentPage + 1) * this.pageSize, this.totalElements);
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.snackbar.error(error?.message || 'Failed to load enquiries');
        this.isLoading = false;
      }
    });
  }

  onSearch(): void {
    this.currentPage = 0;
    console.log('Form values on search:', this.searchForm.value);
    this.loadEnquiries();
  }

  resetForm(): void {
    this.searchForm.reset({
      search: '',
      status: '',
      type: ''
    });
    this.currentPage = 0;
    this.pageSize = 10;
    this.loadEnquiries();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadEnquiries();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 0;
    this.loadEnquiries();
  }

  getStatusLabel(statusValue: string): string {
    const status = this.statusOptions.find(s => s.value === statusValue);
    return status ? status.label : statusValue;
  }

  getTypeLabel(typeValue: string): string {
    const type = this.typeOptions.find(t => t.value === typeValue);
    return type ? type.label : typeValue;
  }

  editEnquiry(id: number): void {
    try {
      // Use encrypted URL parameter only
      const encryptedId = this.urlEncryptionService.encryptId(id);
      if (encryptedId) {
        this.router.navigate(['/enquiry/edit', encryptedId]);
      } else {
        // Fallback to /enquiry/add route if URL encryption fails
        this.router.navigate(['/enquiry/add']);
      }
    } catch (error) {
      console.error('Error encrypting enquiry ID:', error);
      this.snackbar.error('Failed to navigate to edit page');
    }
  }

  viewEnquiry(id: number): void {
    // For now, redirect to edit page since there's no dedicated view component
    this.editEnquiry(id);
  }

  deleteEnquiry(id: number, enquiryName: string): void {
    const confirmMessage = `Are you sure you want to delete enquiry "${enquiryName}"? This action cannot be undone.`;
    
    if (confirm(confirmMessage)) {
      this.isLoading = true;
      this.enquiryService.deleteEnquiryById(id).subscribe({
        next: (response) => {
          this.snackbar.success('Enquiry deleted successfully');
          this.loadEnquiries(); // Refresh the list
        },
        error: (error) => {
          console.error('Error deleting enquiry:', error);
          this.snackbar.error(error?.message || 'Failed to delete enquiry');
          this.isLoading = false;
        }
      });
    }
  }

  // Track by function for ngFor performance optimization
  trackByEnquiryId(index: number, enquiry: EnquiryListItem): number {
    return enquiry.id;
  }

  // Navigate to create new enquiry
  createNewEnquiry(): void {
    // Navigate to add enquiry route
    this.router.navigate(['/enquiry/add']);
  }

  // Get end index for pagination display
  getEndIndex(): number {
    return Math.min(this.endIndex, this.totalElements);
  }

  // Format date for display
  formatDate(dateString: string | undefined): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  // Get status badge class
  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'P': return 'status-pending';
      case 'W': return 'status-win';
      case 'L': return 'status-loss';
      default: return 'status-unknown';
    }
  }

  // Get type badge class
  getTypeBadgeClass(type: string): string {
    switch (type) {
      case 'Individual': return 'type-individual';
      case 'Corporate': return 'type-corporate';
      default: return 'type-unknown';
    }
  }
}
