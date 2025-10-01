import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';
import { SnackbarService } from '../../../shared/services/snackbar.service';
import { MachineService } from '../../../services/machine.service';

@Component({
  selector: 'app-add-machine',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LoaderComponent,
    RouterLink
  ],
  templateUrl: './add-machine.component.html',
  styleUrls: ['./add-machine.component.scss']
})
export class AddMachineComponent implements OnInit {
  form!: FormGroup;
  isLoading = false;
  isEditMode = false;
  id?: number;

  constructor(
    private fb: FormBuilder,
    private machineService: MachineService,
    private router: Router,
    private route: ActivatedRoute,
    private snackbar: SnackbarService
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    if (this.id) {
      this.isEditMode = true;
      this.loadDetail();
    }
  }

  private initializeForm(): void {
    this.form = this.fb.group({
      name: [null, [Validators.required, Validators.maxLength(120)]],
      status: ['A', [Validators.required]]
    });
  }

  private loadDetail(): void {
    if (!this.id) return;
    this.isLoading = true;
    this.machineService.getMachineDetail(this.id).subscribe({
      next: (res) => {
        if (res.success) {
          this.form.patchValue({
            name: res.data.name,
            status: res.data.status
          });
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.snackbar.error(error?.error?.message || 'Failed to load machine');
        this.isLoading = false;
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
    const req = this.isEditMode
      ? this.machineService.updateMachine(this.id!, payload)
      : this.machineService.createMachine(payload);

    req.subscribe({
      next: (res) => {
        if (res.success) {
          this.snackbar.success(res.message || 'Saved');
          this.router.navigate(['/machine']);
        }
      },
      error: (error) => {
        this.snackbar.error(error?.error?.message || 'Failed to save');
        this.isLoading = false;
      }
    });
  }

  isFieldInvalid(name: string): boolean {
    const c = this.form.get(name);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  getFieldError(name: string): string {
    const c = this.form.get(name);
    if (!c || !c.errors || !c.touched) return '';
    if (c.errors['required']) return `${name} is required`;
    if (c.errors['maxlength']) return `${name} is too long`;
    return 'Invalid value';
  }
}


