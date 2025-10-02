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
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadMachines();
    this.loadProducts();
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.isEdit = true;
      this.currentId = Number(idParam);
      this.fetchFullDetails(this.currentId);
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
      mixer: this.fb.array([], [this.minArrayLengthValidator(1)]),
      production: this.fb.array([], [this.minArrayLengthValidator(1)])
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
          machineId: d.machineId
        });
        this.mixerArray.clear();
        (d.mixerItems || []).forEach(item => this.mixerArray.push(this.createMixerGroup(item.productId, item.quantity)));
        this.productionArray.clear();
        (d.productionItems || []).forEach(item => this.productionArray.push(this.createProductionGroup(item.productId, item.quantity, item.numberOfRoll)));
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

  private createProductionGroup(productId: number | null = null, quantity: number | null = null, numberOfRoll: number | null = null): FormGroup {
    return this.fb.group({
      productId: new FormControl<number | null>(productId, { validators: [Validators.required] }),
      quantity: new FormControl<number | null>(quantity, { validators: [Validators.required, Validators.min(0.001)] }),
      numberOfRoll: new FormControl<number | null>(numberOfRoll, { validators: [] })
    });
  }

  refreshMachines(): void {
    this.loadMachines();
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
      mixer: (rawValue.mixer || []).map((m: any) => ({ batchId: rawValue.id ?? null, productId: m.productId, quantity: m.quantity })),
      production: (rawValue.production || []).map((p: any) => ({ batchId: rawValue.id ?? null, productId: p.productId, quantity: p.quantity, numberOfRoll: p.numberOfRoll }))
    };

    this.loading = true;
    this.batchService.upsert(payload).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.snackbar.success(this.isEdit ? 'Batch updated successfully' : 'Batch created successfully');
        this.router.navigate(['/batch']);
      },
      error: () => {
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


