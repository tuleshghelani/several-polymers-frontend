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
      withdrawDate: ['', [Validators.required]] // dd-MM-yyyy
    });
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
            withdrawDate: d.withdrawDate
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

  onSubmit(): void {
    if (this.form.invalid) {
      Object.values(this.form.controls).forEach(c => c.markAsTouched());
      return;
    }
    this.isLoading = true;
    const payload = { ...this.form.value };

    const req$ = this.isEditMode
      ? this.withdrawService.update({ ...payload, id: this.withdrawId as number })
      : this.withdrawService.create(payload);

    req$.subscribe({
      next: (res) => {
        if (res.success) {
          this.snackbar.success(res.message);
          this.router.navigate(['/withdraw']);
        }
        this.isLoading = false;
      },
      error: (err) => {
        this.snackbar.error(err?.message || 'Failed to submit');
        this.isLoading = false;
      }
    });
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


