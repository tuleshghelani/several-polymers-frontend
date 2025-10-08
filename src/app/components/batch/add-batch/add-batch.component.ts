import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { BatchService } from '../../../services/batch.service';
import { BatchFullDetailsResponse, BatchUpsertRequest } from '../../../models/batch.model';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';
import { SearchableSelectComponent } from '../../../shared/components/searchable-select/searchable-select.component';
import { ProductService } from '../../../services/product.service';
import { SnackbarService } from '../../../shared/services/snackbar.service';
import { UrlEncryptionService } from '../../../shared/services/url-encryption.service';
import { EncryptionService } from '../../../shared/services/encryption.service';

@Component({
  selector: 'app-add-batch',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LoaderComponent, SearchableSelectComponent],
  templateUrl: './add-batch.component.html',
  styleUrls: ['./add-batch.component.scss']
})
export class AddBatchComponent implements OnInit, OnDestroy {
  form!: FormGroup;
  isEdit = false;
  loading = false;
  submitted = false;
  private currentId: number | null = null;
  private destroy$ = new Subject<void>();

  machines: Array<{ id: number; name: string }> = [];
  products: any[] = [];

  get mixerArray(): FormArray { return this.form.get('mixer') as FormArray; }
  get productionArray(): FormArray { return this.form.get('production') as FormArray; }

  constructor(
    private fb: FormBuilder,
    private batchService: BatchService,
    private productService: ProductService,
    private snackbar: SnackbarService,
    private router: Router,
    private route: ActivatedRoute,
    private urlEncryptionService: UrlEncryptionService,
    private encryptionService: EncryptionService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadMachines();
    this.loadProducts();
    this.prefillOpeningStocksIfCreate();
    
    // Check for encrypted ID in route params (for edit mode)
    const encryptedIdParam = this.route.snapshot.paramMap.get('encryptedId');
    console.log('encryptedIdParam', encryptedIdParam);
    if (encryptedIdParam) {
      const decryptedId = this.urlEncryptionService.decryptId(encryptedIdParam);
      if (decryptedId) {
        this.isEdit = true;
        this.currentId = decryptedId;
        this.fetchFullDetails(this.currentId);
        return; // Exit early for edit mode
      } else {
        this.snackbar.error('Invalid batch ID. Redirecting to batch list.');
        this.router.navigate(['/batch']);
        return;
      }
    }
    
    // Fallback: Check for regular ID in query params (for backward compatibility)
    const idParam = this.route.snapshot.queryParamMap.get('id');
    if (idParam) {
      this.isEdit = true;
      this.currentId = Number(idParam);
      this.fetchFullDetails(this.currentId);
      return; // Exit early for edit mode
    }
    
    // For create mode: Only check localStorage if we're not explicitly in edit mode
    // and the current route is exactly '/batch/add' or '/batch/create'
    const currentUrl = this.router.url;
    const isCreateRoute = currentUrl === '/batch/add' || currentUrl === '/batch/create';
    
    if (isCreateRoute) {
      // For create mode, clear any existing localStorage data to ensure clean slate
      localStorage.removeItem('editBatchId');
      this.isEdit = false;
      this.currentId = null;
      // Ensure form is reset to default values for create mode
      this.resetFormToDefaults();
      this.prefillOpeningStocksIfCreate();
    } else {
      // Only check localStorage for edit data if we're not on a create route
      const encryptedBatchId = localStorage.getItem('editBatchId');
      if (encryptedBatchId) {
        const decryptedId = this.encryptionService.decrypt(encryptedBatchId);
        if (decryptedId) {
          this.isEdit = true;
          this.currentId = parseInt(decryptedId, 10);
          this.fetchFullDetails(this.currentId);
          // Clear the localStorage after use
          localStorage.removeItem('editBatchId');
        }
      }
    }
  }

  private initForm(): void {
    const today = formatDate(new Date(), 'yyyy-MM-dd', 'en-US');
    this.form = this.fb.group({
      id: new FormControl<number | null>(null),
      date: new FormControl<string>(today, { nonNullable: true, validators: [Validators.required] }),
      shift: new FormControl<string>('D', { nonNullable: true, validators: [Validators.required] }),
      resignBagUse: new FormControl<number>(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
      resignBagOpeningStock: new FormControl<number>({value: 0, disabled: true}, { nonNullable: true }),
      cpwBagUse: new FormControl<number>(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
      cpwBagOpeningStock: new FormControl<number>({value: 0, disabled: true}, { nonNullable: true }),
      machineId: new FormControl<number | null>(null, { validators: [Validators.required] }),
      operator: new FormControl<string>('', { nonNullable: true, validators: [] }),
      mixer: this.fb.array([], [this.minArrayLengthValidator(1)]),
      production: this.fb.array([], [this.minArrayLengthValidator(1)])
    });
  }

  private resetFormToDefaults(): void {
    const today = formatDate(new Date(), 'yyyy-MM-dd', 'en-US');
    
    // Reset form to default values
    this.form.patchValue({
      id: null,
      date: today,
      shift: 'D',
      resignBagUse: 0,
      resignBagOpeningStock: 0,
      cpwBagUse: 0,
      cpwBagOpeningStock: 0,
      machineId: null,
      operator: ''
    });

    // Clear form arrays
    this.mixerArray.clear();
    this.productionArray.clear();

    // Reset form state
    this.form.markAsUntouched();
    this.form.markAsPristine();
    this.submitted = false;
  }

  private prefillOpeningStocksIfCreate(): void {
    // Only prefill in create mode
    if (this.isEdit) { return; }
    this.productService.getRemainingQuantitiesByCodes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res?.success && res?.data) {
            const resign = Number(res.data['RESIGN'] ?? 0);
            const cpw = Number(res.data['CPW'] ?? 0);
            this.form.patchValue({
              resignBagOpeningStock: resign,
              cpwBagOpeningStock: cpw
            });
          }
        },
        error: () => {}
      });
  }

  private minArrayLengthValidator(min: number) {
    return (control: any) => {
      const arr = control as FormArray;
      return arr && arr.length >= min ? null : { minLengthArray: { requiredLength: min, actualLength: arr ? arr.length : 0 } };
    };
  }

  private loadMachines(): void {
    this.batchService.getMachines().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.machines = (res.data || []).filter(m => m.status === 'A').map(m => ({ id: m.id, name: m.name }));
      },
      error: () => {}
    });
  }

  private loadProducts(): void {
    this.productService.getProducts({ status: 'A' } as any).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.products = res?.data?.content || res?.data || [];
      },
      error: () => {}
    });
  }

  private fetchFullDetails(id: number): void {
    this.loading = true;
    this.batchService.getFullDetails(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: BatchFullDetailsResponse) => {
        const d = res.data;
        this.form.patchValue({
          id: d.id,
          date: d.date,
          shift: d.shift,
          resignBagUse: d.resignBagUse,
          resignBagOpeningStock: d.resignBagOpeningStock,
          cpwBagUse: d.cpwBagUse,
          cpwBagOpeningStock: d.cpwBagOpeningStock,
          machineId: d.machineId,
          operator: d.operator || ''
        });
        this.mixerArray.clear();
        (d.mixerItems || []).forEach(item => this.mixerArray.push(this.createMixerGroup(item.productId, item.quantity)));
        this.productionArray.clear();
        (d.productionItems || []).forEach(item => this.productionArray.push(this.createProductionGroup(item.productId, item.quantity, item.numberOfRoll, item.isWastage || false)));
      },
      error: () => {
        this.snackbar.error('Failed to load batch details');
      },
      complete: () => { this.loading = false; }
    });
  }

  addMixer(): void {
    this.mixerArray.push(this.createMixerGroup());
  }

  removeMixer(index: number): void {
    this.mixerArray.removeAt(index);
  }

  addProduction(): void {
    this.productionArray.push(this.createProductionGroup());
  }

  removeProduction(index: number): void {
    this.productionArray.removeAt(index);
  }

  private createMixerGroup(productId: number | null = null, quantity: number | null = null): FormGroup {
    return this.fb.group({
      productId: new FormControl<number | null>(productId, { validators: [Validators.required] }),
      quantity: new FormControl<number | null>(quantity, { validators: [Validators.required, Validators.min(0.001)] })
    });
  }

  private createProductionGroup(productId: number | null = null, quantity: number | null = null, numberOfRoll: number | null = null, isWastage: boolean = false): FormGroup {
    return this.fb.group({
      productId: new FormControl<number | null>(productId, { validators: [Validators.required] }),
      quantity: new FormControl<number | null>(quantity, { validators: [Validators.required, Validators.min(0.001)] }),
      numberOfRoll: new FormControl<number | null>(numberOfRoll, { validators: [] }),
      isWastage: new FormControl<boolean>(isWastage, { validators: [] })
    });
  }

  refreshMachines(): void {
    this.loadMachines();
  }

  // Helpers to display bag counts
  getResignUseBags(): number {
    const kg = Number(this.form?.get('resignBagUse')?.value || 0);
    return +(kg / 25).toFixed(3);
  }

  getCpwOpeningBags(): number {
    const kg = Number(this.form?.get('cpwBagOpeningStock')?.value || 0);
    return +(kg / 250).toFixed(3);
  }

  submit(): void {
    this.submitted = true;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snackbar.error('Please fill required fields and add at least one Mixer and Production item');
      return;
    }

    const rawValue = this.form.getRawValue();
    const payload: BatchUpsertRequest = {
      id: this.isEdit ? (this.currentId as number) : null,
      date: rawValue.date,
      shift: rawValue.shift,
      resignBagUse: rawValue.resignBagUse,
      resignBagOpeningStock: rawValue.resignBagOpeningStock,
      cpwBagUse: rawValue.cpwBagUse,
      cpwBagOpeningStock: rawValue.cpwBagOpeningStock,
      machineId: rawValue.machineId,
      operator: rawValue.operator || undefined,
      mixer: (rawValue.mixer || []).map((m: any) => ({ batchId: rawValue.id ?? null, productId: m.productId, quantity: m.quantity })),
      production: (rawValue.production || []).map((p: any) => ({ batchId: rawValue.id ?? null, productId: p.productId, quantity: p.quantity, numberOfRoll: p.numberOfRoll, isWastage: p.isWastage || false }))
    };

    this.loading = true;
    this.batchService.upsert(payload).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        // Clear any stored encrypted batch ID after successful save/update
        localStorage.removeItem('editBatchId');
        
        this.snackbar.success(this.isEdit ? 'Batch updated successfully' : 'Batch created successfully');
        this.router.navigate(['/batch']);
      },
      error: (error) => {
        console.error('Error saving batch:', error);
        this.snackbar.error('Failed to save batch');
      },
      complete: () => { this.loading = false; }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}


