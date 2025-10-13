import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { EnquiryService } from '../../../services/enquiry.service';
import { EnquiryDetailsResponse, EnquiryUpsertRequest } from '../../../models/enquiry.model';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';
import { SnackbarService } from '../../../shared/services/snackbar.service';
import { UrlEncryptionService } from '../../../shared/services/url-encryption.service';

@Component({
  selector: 'app-add-enquiry',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LoaderComponent],
  templateUrl: './add-enquiry.component.html',
  styleUrls: ['./add-enquiry.component.scss']
})
export class AddEnquiryComponent implements OnInit, OnDestroy {
  form!: FormGroup;
  isEdit = false;
  loading = false;
  submitted = false;
  private currentId: number | null = null;
  private destroy$ = new Subject<void>();

  // Status options
  statusOptions = [
    { label: 'Pending', value: 'P' },
    { label: 'Win', value: 'W' },
    { label: 'Loss', value: 'L' }
  ];

  constructor(
    private fb: FormBuilder,
    private enquiryService: EnquiryService,
    private snackbar: SnackbarService,
    private router: Router,
    private route: ActivatedRoute,
    private urlEncryptionService: UrlEncryptionService
  ) {}

  ngOnInit(): void {
    this.initForm();
    
    // Check for encrypted ID in route params (for edit mode)
    const encryptedIdParam = this.route.snapshot.paramMap.get('encryptedId');
    console.log('encryptedIdParam', encryptedIdParam);
    if (encryptedIdParam) {
      const decryptedId = this.urlEncryptionService.decryptId(encryptedIdParam);
      if (decryptedId) {
        this.isEdit = true;
        this.currentId = decryptedId;
        this.fetchEnquiryDetails(this.currentId);
        return; // Exit early for edit mode
      } else {
        this.snackbar.error('Invalid enquiry ID. Redirecting to enquiry list.');
        this.router.navigate(['/enquiry']);
        return;
      }
    }
    
    // Fallback: Check for regular ID in query params (for backward compatibility)
    const idParam = this.route.snapshot.queryParamMap.get('id');
    if (idParam) {
      this.isEdit = true;
      this.currentId = Number(idParam);
      this.fetchEnquiryDetails(this.currentId);
      return; // Exit early for edit mode
    }
    
    // For create mode: Reset form to default values
    this.isEdit = false;
    this.currentId = null;
    this.resetFormToDefaults();
  }

  private initForm(): void {
    this.form = this.fb.group({
      id: new FormControl<number | null>(null),
      name: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] }),
      mobile: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^[\+]?[1-9][\d]{0,15}$/)] }),
      mail: new FormControl<string>('', { nonNullable: true, validators: [Validators.email] }),
      subject: new FormControl<string>('', { nonNullable: true, validators: [] }),
      address: new FormControl<string>('', { nonNullable: true, validators: [] }),
      description: new FormControl<string>('', { nonNullable: true, validators: [] }),
      status: new FormControl<string>('P', { nonNullable: true, validators: [Validators.required] }),
      type: new FormControl<string>('', { nonNullable: true, validators: [] }),
      company: new FormControl<string>('', { nonNullable: true, validators: [] }),
      city: new FormControl<string>('', { nonNullable: true, validators: [] }),
      state: new FormControl<string>('', { nonNullable: true, validators: [] })
    });
  }

  private resetFormToDefaults(): void {
    // Reset form to default values
    this.form.patchValue({
      id: null,
      name: '',
      mobile: '',
      mail: '',
      subject: '',
      address: '',
      description: '',
      status: 'P',
      type: '',
      company: '',
      city: '',
      state: ''
    });

    // Reset form state
    this.form.markAsUntouched();
    this.form.markAsPristine();
    this.submitted = false;
  }

  private fetchEnquiryDetails(id: number): void {
    this.loading = true;
    this.enquiryService.getEnquiryDetails(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: EnquiryDetailsResponse) => {
        const d = res.data;
        this.form.patchValue({
          id: d.id,
          name: d.name,
          mobile: d.mobile,
          mail: d.mail,
          subject: d.subject,
          address: d.address,
          description: d.description,
          status: d.status,
          type: d.type,
          company: d.company || '',
          city: d.city,
          state: d.state
        });
      },
      error: () => {
        this.snackbar.error('Failed to load enquiry details');
      },
      complete: () => { this.loading = false; }
    });
  }

  submit(): void {
    this.submitted = true;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snackbar.error('Please fill all required fields correctly');
      return;
    }

    const rawValue = this.form.getRawValue();
    const payload: EnquiryUpsertRequest = {
      id: this.isEdit ? (this.currentId as number) : undefined,
      name: rawValue.name,
      mobile: rawValue.mobile,
      mail: rawValue.mail,
      subject: rawValue.subject,
      address: rawValue.address,
      description: rawValue.description,
      status: rawValue.status,
      type: rawValue.type,
      company: rawValue.company || undefined,
      city: rawValue.city,
      state: rawValue.state
    };

    this.loading = true;
    const serviceCall = this.isEdit 
      ? this.enquiryService.updateEnquiry(payload)
      : this.enquiryService.createEnquiry(payload);

    serviceCall.pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.snackbar.success(this.isEdit ? 'Enquiry updated successfully' : 'Enquiry created successfully');
        this.router.navigate(['/enquiry']);
      },
      error: (error) => {
        console.error('Error saving enquiry:', error);
        this.snackbar.error('Failed to save enquiry');
      },
      complete: () => { this.loading = false; }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
