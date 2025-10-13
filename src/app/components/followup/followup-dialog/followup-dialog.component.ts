import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatNativeDateModule } from '@angular/material/core';

import { FollowUpService } from '../../../services/followup.service';
import { SnackbarService } from '../../../shared/services/snackbar.service';

@Component({
  selector: 'app-followup-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatButtonModule,
    MatNativeDateModule
  ],
  templateUrl: './followup-dialog.component.html',
  styleUrls: ['./followup-dialog.component.scss']
})
export class FollowupDialogComponent implements OnInit {
  form!: FormGroup;
  loading = false;
  minDate = new Date();

  constructor(
    private fb: FormBuilder,
    private followupService: FollowUpService,
    private snackbar: SnackbarService,
    public dialogRef: MatDialogRef<FollowupDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { enquiryId: number }
  ) {}

  ngOnInit(): void {
    this.initForm();
  }

  private initForm(): void {
    this.form = this.fb.group({
      nextActionDate: ['', Validators.required],
      description: ['']
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const formValue = this.form.value;
    const nextActionDate = new Date(formValue.nextActionDate);
    
    // Format the date as ISO string
    const payload = {
      enquiryId: this.data.enquiryId,
      nextActionDate: nextActionDate.toISOString(),
      description: formValue.description
    };

    this.loading = true;
    this.followupService.createFollowUp(payload).subscribe({
      next: (response) => {
        this.snackbar.success('Follow-up added successfully');
        this.dialogRef.close(true);
      },
      error: (error) => {
        console.error('Error adding follow-up:', error);
        this.snackbar.error('Failed to add follow-up');
        this.loading = false;
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}