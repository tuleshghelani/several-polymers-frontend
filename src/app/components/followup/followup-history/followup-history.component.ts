import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Subject, takeUntil } from 'rxjs';

import { FollowUp } from '../../../models/followup.model';
import { FollowUpService } from '../../../services/followup.service';
import { SnackbarService } from '../../../shared/services/snackbar.service';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';

@Component({
  selector: 'app-followup-history',
  standalone: true,
  imports: [CommonModule, MatIconModule, LoaderComponent],
  templateUrl: './followup-history.component.html',
  styleUrls: ['./followup-history.component.scss']
})
export class FollowupHistoryComponent implements OnInit, OnDestroy {
  @Input() enquiryId!: number;
  
  followups: FollowUp[] = [];
  loading = false;
  private destroy$ = new Subject<void>();

  constructor(
    private followupService: FollowUpService,
    private snackbar: SnackbarService
  ) {}

  ngOnInit(): void {
    if (this.enquiryId) {
      this.loadFollowups();
    }
  }

  loadFollowups(): void {
    this.loading = true;
    this.followupService.getFollowUps(this.enquiryId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.followups = response.data.followUps;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading followups:', error);
          this.snackbar.error('Failed to load follow-up history');
          this.loading = false;
        }
      });
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}