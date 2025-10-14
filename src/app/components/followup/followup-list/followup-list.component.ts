import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FollowUp, FollowUpSearchRequest, getFollowUpStatusDisplay } from '../../../models/followup.model';
import { FollowUpService } from '../../../services/followup.service';
import { Router } from '@angular/router';
import { UrlEncryptionService } from '../../../shared/services/url-encryption.service';
import { SnackbarService } from '../../../shared/services/snackbar.service';

@Component({
  selector: 'app-followup-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './followup-list.component.html',
  styleUrls: ['./followup-list.component.scss']
})
export class FollowupListComponent implements OnInit {
  followUps: FollowUp[] = [];
  searchForm: FormGroup;
  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;
  sortBy = 'id';
  sortDir = 'desc';
  loading = false;

  constructor(
    private followUpService: FollowUpService,
    private fb: FormBuilder,
    private snackbar: SnackbarService,
    private router: Router,
    private urlEncryptionService: UrlEncryptionService
  ) {
    this.searchForm = this.fb.group({
      id: [''],
      followUpStatus: [''],
      clientId: [''],
      startDate: [''],
      endDate: [''],
      search: ['']
    });
  }

  ngOnInit(): void {
    this.loadFollowUps();
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

  loadFollowUps(): void {
    this.loading = true;
    const searchRequest: FollowUpSearchRequest = {
      id: this.searchForm.get('id')?.value || undefined,
      followUpStatus: this.searchForm.get('followUpStatus')?.value || undefined,
      clientId: this.searchForm.get('clientId')?.value || undefined,
      startDate: this.searchForm.get('startDate')?.value || undefined,
      endDate: this.searchForm.get('endDate')?.value || undefined,
      search: this.searchForm.get('search')?.value || undefined,
      page: this.currentPage,
      size: this.pageSize,
      sortBy: this.sortBy,
      sortDir: this.sortDir
    };

    this.followUpService.searchFollowUps(searchRequest).subscribe({
      next: (response) => {
        if (response.success) {
          this.followUps = response.data.content;
          this.totalElements = response.data.totalElements;
          this.totalPages = response.data.totalPages;
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading follow-ups:', error);
        this.loading = false;
      }
    });
  }

  onSearch(): void {
    this.currentPage = 0;
    this.loadFollowUps();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadFollowUps();
  }

  onSort(field: string): void {
    if (this.sortBy === field) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = field;
      this.sortDir = 'asc';
    }
    this.loadFollowUps();
  }

  getStatusDisplay(status: string): string {
    return getFollowUpStatusDisplay(status);
  }

  resetFilters(): void {
    this.searchForm.reset();
    this.currentPage = 0;
    this.loadFollowUps();
  }
}