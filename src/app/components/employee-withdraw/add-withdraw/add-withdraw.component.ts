import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute, RouterModule } from '@angular/router';
import { EmployeeWithdrawService } from '../../../services/employee-withdraw.service';
import { EmployeeService } from '../../../services/employee.service';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';
import { SearchableSelectComponent } from '../../../shared/components/searchable-select/searchable-select.component';
import { SnackbarService } from '../../../shared/services/snackbar.service';

@Component({
  selector: 'app-add-withdraw',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LoaderComponent,
    RouterLink,
    SearchableSelectComponent,
    RouterModule
  ],
  templateUrl: './add-withdraw.component.html',
  styleUrls: ['./add-withdraw.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddWithdrawComponent implements OnInit {
  form!: FormGroup;
  isLoading = false;
  isEditMode = false;
  withdrawId?: number;
  employees: any[] = [];
  isLoadingEmployees = false;

  constructor(
    private fb: FormBuilder,
    private withdrawService: EmployeeWithdrawService,
    private employeeService: EmployeeService,
    private router: Router,
    private route: ActivatedRoute,
    private snackbar: SnackbarService
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.withdrawId = id ? Number(id) : undefined;
    this.isEditMode = !!this.withdrawId;
    this.loadEmployees();
    if (this.isEditMode) {
      this.loadDetail(this.withdrawId as number);
    }
  }

  private initializeForm(): void {
    this.form = this.fb.group({
      employeeId: ['', [Validators.required]],
      payment: [null, [Validators.required, Validators.min(0.01)]],
      withdrawDate: [this.getCurrentDate(), [Validators.required]],
      remarks: ['']
    });
  }

  private getCurrentDate(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  private loadEmployees(): void {
    this.isLoadingEmployees = true;
    this.employeeService.getAllEmployees().subscribe({
      next: (response) => {
        if (response.success) {
          this.employees = response.data || response.content || [];
        }
        this.isLoadingEmployees = false;
      },
      error: () => {
        this.isLoadingEmployees = false;
      }
    });
  }

  refreshEmployees(): void {
    this.isLoadingEmployees = true;
    this.employeeService.refreshEmployees().subscribe({
      next: (response) => {
        if (response.success) {
          this.employees = response.data || response.content || [];
        }
        this.isLoadingEmployees = false;
      },
      error: () => {
        this.isLoadingEmployees = false;
      }
    });
  }

  private loadDetail(id: number): void {
    this.isLoading = true;
    this.withdrawService.detail(id).subscribe({
      next: (res) => {
        if (res.success) {
          const d = res.data;
          this.form.patchValue({
            employeeId: d.employeeId,
            payment: d.payment,
            withdrawDate: this.formatDateForInput(d.withdrawDate),
            remarks: d.remarks || ''
          });
        }
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.snackbar.error('Failed to load withdraw detail');
      }
    });
  }

  private formatDateForInput(dateString: string): string {
    if (!dateString) return this.getCurrentDate();
    // Convert dd-MM-yyyy to yyyy-MM-dd for date input
    const parts = dateString.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return this.getCurrentDate();
  }

  onSubmit(): void {
    this.markFormGroupTouched(this.form);
    
    if (this.form.valid) {
      this.isLoading = true;
      const payload = this.prepareWithdrawData();

      const req$ = this.isEditMode
        ? this.withdrawService.update({ ...payload, id: this.withdrawId as number })
        : this.withdrawService.create(payload);

      req$.subscribe({
        next: (res) => {
          console.log('✅ Withdraw submit response:', res);
          if (res.success) {
            this.snackbar.success(res.message);
            this.isLoading = false;
            this.router.navigate(['/employee-withdraw']);
          }
        },
        error: (err) => {
          console.error('❌ Withdraw submit error:', err);
          console.error('Error details:', {
            status: err.status,
            statusText: err.statusText,
            message: err.message,
            url: err.url,
            headers: err.headers
          });
          this.snackbar.error(`Failed to submit: ${err.status} - ${err.statusText}`);
          this.isLoading = false;
        }
      });
    } else {
      // Scroll to first error
      const firstError = document.querySelector('.is-invalid');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }

  private prepareWithdrawData() {
    const formValue = this.form.value;
    return {
      ...formValue,
      withdrawDate: this.formatDateForBackend(formValue.withdrawDate)
    };
  }

  private formatDateForBackend(dateString: string): string {
    if (!dateString) return '';
    // Convert yyyy-MM-dd to dd-MM-yyyy for backend
    const parts = dateString.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateString;
  }

  private markFormGroupTouched(formGroup: any) {
    Object.values(formGroup.controls).forEach((control: any) => {
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      } else {
        control.markAsTouched();
        control.markAsDirty();
      }
    });
  }

  resetForm(): void {
    this.initializeForm();
  }

  cancelEdit(): void {
    this.router.navigate(['/employee-withdraw']);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return !!field && field.invalid && (field.dirty || field.touched);
  }

  getFieldError(fieldName: string): string {
    const field = this.form.get(fieldName);
    if (!field) return '';
    if (field.errors?.['required']) return 'This field is required';
    if (field.errors?.['min']) return 'Amount must be greater than 0';
    return 'Invalid value';
  }
}


