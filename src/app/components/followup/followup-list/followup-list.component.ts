import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FollowUp, FollowUpSearchRequest, getFollowUpStatusDisplay } from '../../../models/followup.model';
import { FollowUpService } from '../../../services/followup.service';

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
    private fb: FormBuilder
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