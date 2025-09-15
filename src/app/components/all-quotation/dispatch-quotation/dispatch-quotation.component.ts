import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, FormsModule, AbstractControl } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil, debounceTime, filter, distinctUntilChanged, Subscription } from 'rxjs';
import { formatDate } from '@angular/common';
import { Dialog } from '@angular/cdk/dialog';
import { EncryptionService } from '../../../shared/services/encryption.service';
import { ProductService } from '../../../services/product.service';
import { CustomerService } from '../../../services/customer.service';
import { SnackbarService } from '../../../shared/services/snackbar.service';
import { QuotationService } from '../../../services/quotation.service';
import { BrandService, Brand } from '../../../services/brand.service';
import { TransportMasterService, TransportMaster } from '../../../services/transport-master.service';
import { SearchableSelectComponent } from "../../../shared/components/searchable-select/searchable-select.component";
import { MatDialogModule } from '@angular/material/dialog';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';

@Component({
  standalone: true,
  selector: 'app-dispatch-quotation',
  templateUrl: './dispatch-quotation.component.html',
  styleUrl: './dispatch-quotation.component.scss',
  imports: [SearchableSelectComponent,
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule, MatDialogModule, LoaderComponent]
})
export class DispatchQuotationComponent implements OnInit, OnDestroy {
  quotationForm!: FormGroup;
  products: any[] = [];
  customers: any[] = [];
  brands: Brand[] = [];
  transports: TransportMaster[] = [];
  loading = false;
  isLoadingProducts = false;
  isLoadingCustomers = false;
  isLoadingBrands = false;
  isLoadingTransports = false;
  minValidUntilDate: string;
  private destroy$ = new Subject<void>();
  isLoading = false;
  isEdit = false;
  quotationId?: number;
  private itemSubscriptions: Subscription[] = [];
  private lastStatusByIndex: { [index: number]: string } = {};
  private lastCreatedRollByIndex: { [index: number]: number } = {};

  get itemsFormArray() {
    return this.quotationForm.get('items') as FormArray;
  }

  constructor(
    private fb: FormBuilder,
    private quotationService: QuotationService,
    private productService: ProductService,
    private customerService: CustomerService,
    private brandService: BrandService,
    private transportService: TransportMasterService,
    private snackbar: SnackbarService,
    private encryptionService: EncryptionService,
    private router: Router,
    private dialog: Dialog,
    private cdr: ChangeDetectorRef
  ) {
    const today = new Date();
    this.minValidUntilDate = formatDate(today, 'yyyy-MM-dd', 'en');
    this.initForm();
  }

  ngOnInit() {
    this.loadProducts();
    this.loadCustomers();
    this.loadBrands();
    this.loadTransports();
    this.setupCustomerNameSync();
    this.checkForEdit();
    this.setupItemSubscriptions();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.itemSubscriptions.forEach(sub => sub?.unsubscribe());
  }

  private initForm() {
    const today = new Date();
    const validUntil = new Date();
    validUntil.setDate(today.getDate() + 7);

    this.quotationForm = this.fb.group({
      customerId: [''],
      customerName: ['', Validators.required],
      referenceName: [''],
      contactNumber: ['', Validators.required],
      quoteDate: [formatDate(today, 'yyyy-MM-dd', 'en')],
      validUntil: [formatDate(validUntil, 'yyyy-MM-dd', 'en'), [Validators.required]],
      remarks: [''],
      termsConditions: [''],
      items: this.fb.array([]),
      address: [''],
      isProduction: [false],
      transportMasterId: [null, Validators.required],
      caseNumber: [''],
      packagingAndForwadingCharges: [0, [Validators.required, Validators.min(0)]]
    });

    this.addItem(true);
  }

  get isCustomerIdSelected(){
    return this.quotationForm?.get('customerId')?.value
  }

  private setupCustomerNameSync() {
    this.quotationForm.get('customerId')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(customerId => {
        if (customerId) {
          const selectedCustomer = this.customers.find(c => c.id === customerId);
          if (selectedCustomer) {
            this.quotationForm.patchValue({ customerName: selectedCustomer.name });
            this.quotationForm.patchValue({ address: selectedCustomer.address });
            this.quotationForm.patchValue({ contactNumber: selectedCustomer.mobile });
            this.quotationForm.patchValue({ referenceName: selectedCustomer.referenceName });
            
          }
        }
      });
  }

  addItem(isInitializing = false): void {
    const itemGroup = this.fb.group({
      productId: ['', Validators.required],
      productName: [''],
      productType: [''],
      quantity: [0, [Validators.required, Validators.min(0)]],
      unitPrice: [0, [Validators.required, Validators.min(0.01)]],
      brandId: [null],
      brandName: [''],
      numberOfRoll: [0, [Validators.required, Validators.min(0)]],
      weightPerRoll: [0, [Validators.required, Validators.min(0)]],
      isQuantityManual: [false],
      remarks: [''],
      // Dispatch-only additional fields
      isProduction: [false],
      id: [null],
      quotationItemStatus: ['O', Validators.required],
      createdRoll: [0, [Validators.required, Validators.min(0)]],
      // Price-related fields retained for backend compatibility but hidden in UI
      price: [0],
      taxPercentage: [0],
      taxAmount: [0],
      finalPrice: [0],
      quotationDiscountAmount: [0],
      calculations: [[]]
    });

    this.itemsFormArray.push(itemGroup);
    const newIndex = this.itemsFormArray.length - 1;
    this.setupItemCalculations(itemGroup, newIndex);
    this.subscribeToItemChanges(this.itemsFormArray.at(newIndex), newIndex);
    this.calculateItemPrice(newIndex, isInitializing);
  }

  removeItem(index: number): void {
    if (this.itemSubscriptions[index]) {
      this.itemSubscriptions[index].unsubscribe();
      this.itemSubscriptions.splice(index, 1);
    }
    this.itemsFormArray.removeAt(index);
    this.itemsFormArray.controls.forEach((control, newIndex) => {
      if (this.itemSubscriptions[newIndex]) {
        this.itemSubscriptions[newIndex].unsubscribe();
      }
      this.subscribeToItemChanges(control, newIndex);
    });
    this.cdr.detectChanges();
  }

  private setupItemCalculations(group: FormGroup, index: number) {
    group.get('productId')?.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        filter(productId => !!productId),
        debounceTime(100),
        distinctUntilChanged()
      )
      .subscribe(productId => {
        const selectedProduct = this.products.find(p => p.id === productId);
        if (selectedProduct) {
          group.patchValue({
            productType: selectedProduct.type,
            productName: selectedProduct.name,
            taxPercentage: selectedProduct.tax_percentage ?? 0,
            quantity: selectedProduct.quantity || 1
          }, { emitEvent: false });
          // Use product's sale_amount as unit price for consistency
          group.patchValue({ unitPrice: selectedProduct.sale_amount || 0 }, { emitEvent: true });
        }
      });

    group.get('numberOfRoll')?.valueChanges
      .pipe(takeUntil(this.destroy$), debounceTime(50))
      .subscribe(() => this.updateQuantityFromRolls(index));
    group.get('weightPerRoll')?.valueChanges
      .pipe(takeUntil(this.destroy$), debounceTime(50))
      .subscribe(() => this.updateQuantityFromRolls(index));
    group.get('quantity')?.valueChanges
      .pipe(takeUntil(this.destroy$), debounceTime(50))
      .subscribe(() => this.markQuantityManual(index));
  }

  private markQuantityManual(index: number) {
    const group = this.itemsFormArray.at(index) as FormGroup;
    if (!group) return;
    if (!group.get('isQuantityManual')?.value) {
      group.patchValue({ isQuantityManual: true }, { emitEvent: false });
    }
  }

  onQuantityEdit(index: number) {
    this.markQuantityManual(index);
    this.calculateItemPrice(index);
  }

  onRollWeightChange(index: number) {
    this.updateQuantityFromRolls(index);
  }

  private updateQuantityFromRolls(index: number) {
    const group = this.itemsFormArray.at(index) as FormGroup;
    if (!group) return;
    const isManual = !!group.get('isQuantityManual')?.value;
    if (isManual) {
      return;
    }
    const rolls = Number(group.get('numberOfRoll')?.value || 0);
    const weight = Number(group.get('weightPerRoll')?.value || 0);
    const computedQty = Number((rolls * weight).toFixed(3));
    group.patchValue({ quantity: computedQty }, { emitEvent: false });
    this.calculateItemPrice(index);
  }

  private calculateItemPrice(index: number, skipChangeDetection = false): void {
    const group = this.itemsFormArray.at(index) as FormGroup;
    const quantity = Number(Number(group.get('quantity')?.value || 0).toFixed(3));
    const unitPrice = Number(Number(group.get('unitPrice')?.value || 0).toFixed(2));
    const basePrice = Number((quantity * unitPrice).toFixed(2));
    // Keep internal price fields updated for backend, but not shown in UI
    group.patchValue({
      price: basePrice,
      taxAmount: 0,
      finalPrice: basePrice,
      quotationDiscountAmount: 0
    }, { emitEvent: false });
    if (!skipChangeDetection) {
      this.cdr.detectChanges();
    }
  }

  private loadProducts(): void {
    this.isLoadingProducts = true;
    this.productService.getProducts({ status: 'A' }).subscribe({
      next: (response) => {
        if (response.success) {
          this.products = response.data;
        }
        this.isLoadingProducts = false;
      },
      error: () => {
        this.snackbar.error('Failed to load products');
        this.isLoadingProducts = false;
      }
    });
  }

  refreshProducts(): void {
    this.isLoadingProducts = true;
    this.productService.refreshProducts().subscribe({
      next: (response) => {
        if (response.success) {
          this.products = response.data;
          this.snackbar.success('Products refreshed successfully');
        }
        this.isLoadingProducts = false;
      },
      error: () => {
        this.snackbar.error('Failed to refresh products');
        this.isLoadingProducts = false;
      }
    });
  }

  private loadBrands(): void {
    this.isLoadingBrands = true;
    this.brandService.getBrands({ status: 'A' }).subscribe({
      next: (response) => {
        if (response?.success !== false) {
          this.brands = response.data || response.brands || [];
        }
        this.isLoadingBrands = false;
      },
      error: () => {
        this.snackbar.error('Failed to load brands');
        this.isLoadingBrands = false;
      }
    });
  }

  refreshBrands(): void {
    this.isLoadingBrands = true;
    this.brandService.refreshBrands().subscribe({
      next: (response) => {
        if (response?.success !== false) {
          this.brands = response.data || response.brands || [];
          this.snackbar.success('Brands refreshed successfully');
        }
        this.isLoadingBrands = false;
      },
      error: () => {
        this.snackbar.error('Failed to refresh brands');
        this.isLoadingBrands = false;
      }
    });
  }

  private loadTransports(): void {
    this.isLoadingTransports = true;
    this.transportService.getTransports({ status: 'A' }).subscribe({
      next: (response) => {
        if (response?.success !== false) {
          this.transports = response.data || response.transports || [];
        }
        this.isLoadingTransports = false;
      },
      error: () => {
        this.snackbar.error('Failed to load transports');
        this.isLoadingTransports = false;
      }
    });
  }

  refreshTransports(): void {
    this.isLoadingTransports = true;
    this.transportService.refreshTransports().subscribe({
      next: (response) => {
        if (response?.success !== false) {
          this.transports = response.data || response.transports || [];
          this.snackbar.success('Transports refreshed successfully');
        }
        this.isLoadingTransports = false;
      },
      error: () => {
        this.snackbar.error('Failed to refresh transports');
        this.isLoadingTransports = false;
      }
    });
  }

  private loadCustomers(): void {
    this.isLoadingCustomers = true;
    this.customerService.getCustomers({ status: 'A' }).subscribe({
      next: (response) => {
        if (response.success) {
          this.customers = response.data;
        }
        this.isLoadingCustomers = false;
      },
      error: () => {
        this.snackbar.error('Failed to load customers');
        this.isLoadingCustomers = false;
      }
    });
  }

  refreshCustomers(): void {
    this.isLoadingCustomers = true;
    this.customerService.refreshCustomers().subscribe({
      next: (response) => {
        if (response.success) {
          this.customers = response.data;
          this.snackbar.success('Customers refreshed successfully');
        }
        this.isLoadingCustomers = false;
      },
      error: () => {
        this.snackbar.error('Failed to refresh customers');
        this.isLoadingCustomers = false;
      }
    });
  }

  onProductSelect(index: number, event: any): void {
    const selectedProduct = this.products.find(p => p.id === event.value);
    if (!selectedProduct) {
      return;
    }
    const itemGroup = this.itemsFormArray.at(index);
    const oldSub = this.itemSubscriptions[index];
    if (oldSub) {
      oldSub.unsubscribe();
      this.itemSubscriptions[index] = new Subscription();
    }
    itemGroup.patchValue({
      productId: selectedProduct.id
    }, { emitEvent: true });
    if (!this.itemSubscriptions[index]) {
      this.subscribeToItemChanges(itemGroup, index);
    }
  }

  private checkForEdit(): void {
    const encryptedId = localStorage.getItem('editQuotationId');
    if (!encryptedId) {
      return;
    }
    try {
      const quotationId = this.encryptionService.decrypt(encryptedId);
      if (!quotationId) {
        localStorage.removeItem('editQuotationId');
        return;
      }
      this.isLoading = true;
      this.quotationService.getQuotationDetail(parseInt(quotationId)).subscribe({
        next: (response) => {
          if (response) {
            this.quotationId = parseInt(quotationId);
            this.isEdit = true;
            this.populateForm(response.data);
          }
          this.isLoading = false;
        },
        error: () => {
          this.snackbar.error('Failed to load quotation details');
          this.isLoading = false;
          localStorage.removeItem('editQuotationId');
        }
      });
    } catch (error) {
      localStorage.removeItem('editQuotationId');
    }
  }

  async populateForm(data: any) {
    if (!data) return;
    // Clear existing item subscriptions to avoid duplicate subscriptions
    this.itemSubscriptions.forEach(sub => sub?.unsubscribe());
    this.itemSubscriptions = [];
    while (this.itemsFormArray.length) {
      this.itemsFormArray.removeAt(0);
    }
    this.quotationForm.patchValue({
      customerName: data.customerName,
      customerId: data.customerId,
      referenceName: data.referenceName || '',
      quoteDate: data.quoteDate,
      validUntil: data.validUntil,
      remarks: data.remarks || '',
      termsConditions: data.termsConditions || '',
      address: data.address,
      contactNumber: data.contactNumber,
      transportMasterId: data.transportMasterId || null,
      caseNumber: data.caseNumber || '',
      packagingAndForwadingCharges: data.packagingAndForwadingCharges ?? 0
    });
    if (data.items && Array.isArray(data.items)) {
      data.items.forEach((item: any, idx: number) => {
        const itemGroup = this.fb.group({
          id: [item.id || null],
          productId: [item.productId || '', Validators.required],
          productName: [item.productName || item.product?.name || ''],
          productType: [item.productType || ''],
          quantity: [item.quantity || 1, [Validators.required, Validators.min(1)]],
          unitPrice: [item.unitPrice || 0, [Validators.required, Validators.min(0.01)]],
          brandId: [item.brandId || null],
          brandName: [item.brandName || item.brand?.name || ''],
          numberOfRoll: [item.numberOfRoll ?? 0, [Validators.required, Validators.min(0)]],
          weightPerRoll: [item.weightPerRoll ?? 0, [Validators.required, Validators.min(0)]],
          remarks: [item.remarks || ''],
          // dispatch extras
          isProduction: [item.isProduction ?? false],
          quotationItemStatus: [item.quotationItemStatus ?? 'O', Validators.required],
          createdRoll: [item.createdRoll ?? 0, [Validators.required, Validators.min(0)]],
          // price fields for backend
          price: [item.price || 0],
          taxPercentage: [item.taxPercentage ?? 0],
          taxAmount: [item.taxAmount || 0],
          finalPrice: [item.finalPrice || 0],
          quotationDiscountAmount: [item.quotationDiscountAmount || 0],
          calculations: [item.calculations || []]
        });
        this.setupItemCalculations(itemGroup, this.itemsFormArray.length);
        this.itemsFormArray.push(itemGroup);
        // Ensure item change subscriptions are active for updated items
        this.subscribeToItemChanges(itemGroup, this.itemsFormArray.length - 1);
      });
    }
    this.itemsFormArray.controls.forEach((_, index) => {
      this.calculateItemPrice(index);
    });
    this.cdr.detectChanges();
  }

  onSubmit(): void {
    if (this.quotationForm.valid) {
      this.isLoading = true;
      const formData = this.prepareFormData();
      const request$ = this.isEdit
        ? this.quotationService.updateQuotation(this.quotationId!, formData)
        : this.quotationService.createQuotation(formData);
      request$.subscribe({
        next: (response: any) => {
          if (response.success) {
            this.snackbar.success(`Quotation ${this.isEdit ? 'updated' : 'created'} successfully`);
            this.quotationForm.reset();
            this.router.navigate(['/quotation']);
          }
          this.isLoading = false;
        },
        error: (error: any) => {
          this.snackbar.error(error?.error?.message || `Failed to ${this.isEdit ? 'update' : 'create'} quotation`);
          this.isLoading = false;
        }
      });
    }
  }

  private prepareFormData() {
    const formValue = this.quotationForm.value;
    const items = this.itemsFormArray.controls.map((control) => {
      return {
        productId: control.get('productId')?.value,
        productName: control.get('productName')?.value,
        productType: control.get('productType')?.value,
        quantity: control.get('quantity')?.value,
        unitPrice: control.get('unitPrice')?.value,
        brandId: control.get('brandId')?.value,
        brandName: control.get('brandName')?.value,
        numberOfRoll: control.get('numberOfRoll')?.value,
        weightPerRoll: control.get('weightPerRoll')?.value,
        remarks: control.get('remarks')?.value,
        // dispatch extras
        isProduction: control.get('isProduction')?.value,
        quotationItemStatus: control.get('quotationItemStatus')?.value,
        createdRoll: control.get('createdRoll')?.value,
        // backend fields
        price: control.get('price')?.value,
        taxPercentage: control.get('taxPercentage')?.value,
        taxAmount: control.get('taxAmount')?.value,
        finalPrice: control.get('finalPrice')?.value,
        quotationDiscountAmount: control.get('quotationDiscountAmount')?.value,
        calculations: control.get('calculations')?.value || []
      };
    });
    const finalFormData = {
      customerId: formValue.customerId,
      customerName: formValue.customerName,
      referenceName: formValue.referenceName,
      contactNumber: formValue.contactNumber,
      quoteDate: formatDate(formValue.quoteDate, 'yyyy-MM-dd', 'en'),
      validUntil: formatDate(formValue.validUntil, 'yyyy-MM-dd', 'en'),
      remarks: formValue.remarks,
      termsConditions: formValue.termsConditions,
      address: formValue.address,
      transportMasterId: formValue.transportMasterId,
      caseNumber: formValue.caseNumber,
      packagingAndForwadingCharges: Number(formValue.packagingAndForwadingCharges || 0),
      items: items
    };
    return finalFormData;
  }

  private setupItemSubscriptions(): void {
    this.itemsFormArray.controls.forEach((control, index) => {
      this.subscribeToItemChanges(control, index);
    });
  }

  private subscribeToItemChanges(control: AbstractControl, index: number): void {
    if (this.itemSubscriptions[index]) {
      this.itemSubscriptions[index].unsubscribe();
    }
    const subscription = control.valueChanges.pipe(
      takeUntil(this.destroy$),
      debounceTime(100),
    ).subscribe(() => {
      this.calculateItemPrice(index);
    });
    this.itemSubscriptions[index] = subscription;

    // We now handle status updates via explicit (change) handler to control revert UX
  }

  onStatusChange(index: number, event: Event) {
    const group = this.itemsFormArray.at(index) as FormGroup;
    const id = group.get('id')?.value;
    if (!id) {
      return;
    }
    const target = event.target as HTMLSelectElement;
    const newStatus = target.value;
    const previousStatus = this.lastStatusByIndex[index] ?? group.get('quotationItemStatus')?.value;

    // If no change, do nothing
    if (previousStatus === newStatus) {
      return;
    }

    // Enforce forward-only transitions
    const isInvalidTransition =
      (previousStatus === 'I' && newStatus === 'O') ||
      (previousStatus === 'C' && (newStatus === 'O' || newStatus === 'I')) ||
      (previousStatus === 'B' && (newStatus === 'O' || newStatus === 'I' || newStatus === 'C'));

    if (isInvalidTransition) {
      this.snackbar.error('Invalid transition. Status can only move forward.');
      // revert UI selection
      group.patchValue({ quotationItemStatus: previousStatus }, { emitEvent: false });
      this.cdr.detectChanges();
      return;
    }

    this.quotationService.updateQuotationItemStatus(id, newStatus)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res?.success) {
            this.snackbar.success('Status updated successfully');
            this.lastStatusByIndex[index] = newStatus;
          } else {
            this.snackbar.error(res?.message || 'Failed to update status');
            group.patchValue({ quotationItemStatus: previousStatus }, { emitEvent: false });
            this.cdr.detectChanges();
          }
        },
        error: (err) => {
          this.snackbar.error(err?.error?.message || 'Failed to update status');
          group.patchValue({ quotationItemStatus: previousStatus }, { emitEvent: false });
          this.cdr.detectChanges();
        }
      });
  }

  onStatusFocus(index: number) {
    const group = this.itemsFormArray.at(index) as FormGroup;
    const current = group.get('quotationItemStatus')?.value;
    this.lastStatusByIndex[index] = current;
  }

  onCreatedRollFocus(index: number) {
    const group = this.itemsFormArray.at(index) as FormGroup;
    const current = Number(group.get('createdRoll')?.value || 0);
    this.lastCreatedRollByIndex[index] = current;
  }

  onCreatedRollChange(index: number, event: Event) {
    const group = this.itemsFormArray.at(index) as FormGroup;
    const id = group.get('id')?.value;
    if (!id) return;
    const target = event.target as HTMLInputElement;
    const newValue = Number(target.value);
    const prevValue = this.lastCreatedRollByIndex[index] ?? Number(group.get('createdRoll')?.value || 0);

    if (Number.isNaN(newValue) || newValue < 0) {
      this.snackbar.error('Invalid value for Created Roll');
      group.patchValue({ createdRoll: prevValue }, { emitEvent: false });
      this.cdr.detectChanges();
      return;
    }

    if (newValue === prevValue) {
      return;
    }

    this.quotationService.updateQuotationItemCreatedRoll(id, newValue)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res?.status === 'success' || res?.success) {
            this.snackbar.success('Created roll updated successfully');
            this.lastCreatedRollByIndex[index] = newValue;
          } else {
            this.snackbar.error(res?.message || 'Failed to update created roll');
            group.patchValue({ createdRoll: prevValue }, { emitEvent: false });
            this.cdr.detectChanges();
          }
        },
        error: (err) => {
          this.snackbar.error(err?.error?.message || 'Failed to update created roll');
          group.patchValue({ createdRoll: prevValue }, { emitEvent: false });
          this.cdr.detectChanges();
        }
      });
  }

  onProductionClick(index: number, event: Event) {
    const group = this.itemsFormArray.at(index) as FormGroup;
    const status = group.get('quotationItemStatus')?.value;
    if (status === undefined || status === null || status === '' || status !== 'O') {
      event.preventDefault();
      event.stopPropagation();
      this.snackbar.error('Allowed only when status is Open');
      return false as unknown as void;
    }
  }

  onProductionToggle(index: number) {
    const group = this.itemsFormArray.at(index) as FormGroup;
    const status = group.get('quotationItemStatus')?.value;
    if (status === undefined || status === null || status === '' || status !== 'O') {
      // Disallow changes when not Open; revert UI change just in case
      const current = !!group.get('isProduction')?.value;
      group.patchValue({ isProduction: !current }, { emitEvent: false });
      return;
    }
    const quotationItemId = group.get('id')?.value;
    const isProduction = !!group.get('isProduction')?.value;
    if (!quotationItemId) {
      // Not yet persisted; just ignore API call
      return;
    }
    this.quotationService.updateQuotationItemProductionStatus(quotationItemId, isProduction)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.snackbar.success('Production status updated');
        },
        error: () => {
          this.snackbar.error('Failed to update production status');
          // Revert toggle on error
          group.patchValue({ isProduction: !isProduction }, { emitEvent: false });
          this.cdr.detectChanges();
        }
      });
  }
}


