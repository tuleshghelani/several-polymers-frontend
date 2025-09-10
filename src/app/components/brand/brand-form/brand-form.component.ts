import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';
import { SnackbarService } from '../../../shared/services/snackbar.service';
import { Brand, BrandService } from '../../../services/brand.service';
import { EncryptionService } from '../../../shared/services/encryption.service';

@Component({
  selector: 'app-brand-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LoaderComponent,
    RouterLink
  ],
  templateUrl: './brand-form.component.html',
  styleUrls: ['./brand-form.component.scss']
})
export class BrandFormComponent implements OnInit {
  form!: FormGroup;
  isLoading = false;
  isEditMode = false;
  brandId?: number;

  constructor(
    private fb: FormBuilder,
    private service: BrandService,
    private router: Router,
    private snackbar: SnackbarService,
    private encryption: EncryptionService
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    const stored = localStorage.getItem('brandId');
    if (stored) {
      const decrypted = this.encryption.decrypt(stored);
      if (decrypted) {
        this.brandId = Number(decrypted);
        this.isEditMode = true;
        this.loadDetails(this.brandId);
      }
    }
  }

  getFieldError(field: string): string {
    const control = this.form.get(field);
    if (!control || !control.errors) return '';
    if (control.errors['required']) return `${this.getPrettyLabel(field)} is required`;
    if (control.errors['maxlength']) return `${this.getPrettyLabel(field)} is too long`;
    return 'Invalid value';
  }
  isFieldInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }
  isFieldValid(field: string): boolean {
    const control = this.form.get(field);
    return !!(control && control.valid && (control.dirty || control.touched));
  }
  private getPrettyLabel(field: string): string {
    switch (field) {
      case 'name': return 'Name';
      case 'remarks': return 'Remarks';
      default: return field;
    }
  }

  private initializeForm(): void {
    this.form = this.fb.group({
      name: [null, [Validators.required, Validators.maxLength(100)]],
      remarks: [null, [Validators.maxLength(200)]],
      status: ['A']
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      Object.values(this.form.controls).forEach(c => c.markAsTouched());
      return;
    }
    this.isLoading = true;
    const payload: Brand = {
      id: this.brandId,
      ...this.form.value
    };
    const request$ = this.isEditMode ? this.service.update(payload) : this.service.create(payload);
    request$.subscribe({
      next: (response) => {
        if (response?.success === false) {
          this.snackbar.error(response?.message || 'Operation failed');
          this.isLoading = false;
          return;
        }
        this.snackbar.success(`Brand ${this.isEditMode ? 'updated' : 'created'} successfully`);
        localStorage.removeItem('brandId');
        this.router.navigate(['/brand']);
      },
      error: (error) => {
        this.snackbar.error(error?.error?.message || `Failed to ${this.isEditMode ? 'update' : 'create'} brand`);
        this.isLoading = false;
      }
    });
  }

  private loadDetails(id: number): void {
    this.isLoading = true;
    this.service.details(id).subscribe({
      next: (res) => {
        const data = res?.data || res;
        if (data) {
          this.form.patchValue({
            name: data.name,
            remarks: data.remarks,
            status: data.status
          });
        }
        this.isLoading = false;
      },
      error: () => {
        this.snackbar.error('Failed to load brand details');
        this.isLoading = false;
      }
    });
  }
}


