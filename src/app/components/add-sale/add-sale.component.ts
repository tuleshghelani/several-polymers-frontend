import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, ValidatorFn, AbstractControl, ValidationErrors, FormControl } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil, Subscription, distinctUntilChanged } from 'rxjs';
import { formatDate } from '@angular/common';
import { HttpClient } from '@angular/common/http';

import { ProductService } from '../../services/product.service';
import { SaleService } from '../../services/sale.service';
import { CustomerService } from '../../services/customer.service';
import { SnackbarService } from '../../shared/services/snackbar.service';
import { LoaderComponent } from '../../shared/components/loader/loader.component';
import { SearchableSelectComponent } from '../../shared/components/searchable-select/searchable-select.component';
import { EncryptionService } from '../../shared/services/encryption.service';
import { TransportMasterService } from '../../services/transport-master.service';

interface ProductForm {
  productId: string;
  quantity: number;
  unitPrice: number;
  finalPrice: number;
  numberOfRoll: number;
  weightPerRoll: number;
  remarks: string
}
@Component({
  selector: 'app-add-sale',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LoaderComponent,
    SearchableSelectComponent
  ],
  templateUrl: './add-sale.component.html',
  styleUrl: './add-sale.component.scss'
})
export class AddSaleComponent implements OnInit, OnDestroy {
  saleForm!: FormGroup;
  products: any[] = [];
  customers: any[] = [];
  transports: any[] = [];
  loading = false;
  isLoadingProducts = false;
  isLoadingCustomers = false;
  isLoadingTransports = false;
  isEdit = false;
  private currentSaleId: number | null = null;
  private destroy$ = new Subject<void>();
  private productSubscriptions: Subscription[] = [];
  private isPopulating = false;

  get productsFormArray() {
    return this.saleForm.get('products') as FormArray;
  }

  get saleDiscountControl(): FormControl {
    return this.saleForm.get('saleDiscountPercentage') as FormControl;
  }

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private customerService: CustomerService,
    private saleService: SaleService,
    private snackbar: SnackbarService,
    private http: HttpClient,
    private router: Router,
    private encryptionService: EncryptionService,
    private transportMasterService: TransportMasterService
  ) {
    this.initForm();
  }

  ngOnInit() {
    this.loadProducts();
    this.loadCustomers();
    this.loadTransports();
    
    // Recalculate all rows if sale discount percentage changes
    this.saleForm.get('saleDiscountPercentage')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.isPopulating) return;
        this.productsFormArray.controls.forEach((_, idx) => this.calculateProductPrice(idx));
      });

    // If creating a new sale and Black = Yes, default sale discount to 100
    this.saleForm.get('isBlack')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((isBlack: boolean) => {
        if (!this.isEdit && isBlack === true) {
          this.saleForm.patchValue({ saleDiscountPercentage: 100 }, { emitEvent: true });
        }
      });

    const encryptedId = localStorage.getItem('saleId');
    if (encryptedId) {
      const saleId = this.encryptionService.decrypt(encryptedId);
      if (saleId) {
        this.currentSaleId = Number(saleId);
        this.fetchSaleDetails(this.currentSaleId);
      }
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.productSubscriptions.forEach(sub => sub?.unsubscribe());
  }

  private initForm() {
    this.saleForm = this.fb.group({
      customerId: ['', Validators.required],
      saleDate: [formatDate(new Date(), 'yyyy-MM-dd', 'en'), Validators.required],
      invoiceNumber: ['', Validators.required],
      referenceName: [''],
      caseNumber: [''],
      transportMasterId: [null],
      // Discount percentage applied on GST amount only (same logic as quotation)
      saleDiscountPercentage: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
      saleDiscountAmount: [0, [Validators.required, Validators.min(0)]],
      products: this.fb.array([]),
      isBlack: [false, Validators.required]
    });

    // Add initial product form group
    this.addProduct();
  }

  private createProductFormGroup(): FormGroup {
    return this.fb.group({
      productId: ['', Validators.required],
      quantity: ['', [Validators.required, Validators.min(1)]],
      unitPrice: ['', [Validators.required, Validators.min(0.01)]],
      price: [{ value: 0, disabled: true }],
      taxPercentage: [{ value: 0, disabled: true }],
      discountPrice: [{ value: 0, disabled: true }],
      discountAmount: [{ value: 0, disabled: true }],
      taxAmount: [{ value: 0, disabled: true }],
      finalPrice: [{ value: 0, disabled: true }],
      numberOfRoll: [0, [Validators.min(0)]],
      weightPerRoll: [0, [Validators.min(0)]],
      remarks:[null, []]
    });
  }

  addProduct() {
    const productGroup = this.createProductFormGroup();
    this.setupProductCalculations(productGroup, this.productsFormArray.length);
    this.productsFormArray.push(productGroup);
  }

  removeProduct(index: number): void {
    if (this.productsFormArray.length === 1) return;
    
    // Unsubscribe from the removed product's subscription
    if (this.productSubscriptions[index]) {
      this.productSubscriptions[index].unsubscribe();
      this.productSubscriptions.splice(index, 1);
    }
    
    this.productsFormArray.removeAt(index);
    
    // Resubscribe remaining products with correct indices
    this.productsFormArray.controls.forEach((control, newIndex) => {
      if (this.productSubscriptions[newIndex]) {
        this.productSubscriptions[newIndex].unsubscribe();
      }
      this.setupProductCalculations(control as FormGroup, newIndex);
    });

    this.calculateTotalAmount();
  }

  private setupProductCalculations(group: FormGroup, index: number) {
    // Recalculate when product row changes
    const subscription = group.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.isPopulating) return;
        this.calculateProductPrice(index);
      });
    this.productSubscriptions[index] = subscription;

    // Update tax percentage automatically based on selected product
    group.get('productId')?.valueChanges
      .pipe(takeUntil(this.destroy$), distinctUntilChanged())
      .subscribe((productId: any) => {
        if (this.isPopulating) return;
        const selectedProduct = this.products.find(p => p.id === productId);
        if (!selectedProduct) return;
        const taxPercentage = selectedProduct.taxPercentage !== undefined ? selectedProduct.taxPercentage : 0;
        const currentUnitPrice = group.get('unitPrice')?.value;
        group.patchValue({
          taxPercentage: taxPercentage,
          unitPrice: currentUnitPrice || selectedProduct.sale_amount || 0
        }, { emitEvent: true });
      });
  }

  private calculateProductPrice(index: number): void {
    const group = this.productsFormArray.at(index) as FormGroup;
    if (!group) return;

    const quantity = Number(group.get('quantity')?.value || 0);
    const unitPrice = Number(group.get('unitPrice')?.value || 0);
    const taxPct = Number(group.get('taxPercentage')?.value || 0);
    const discountPct = Number(this.saleForm.get('saleDiscountPercentage')?.value || 0);

    const basePrice = Number((quantity * unitPrice).toFixed(2));
    const grossTaxAmount = Number(((basePrice * taxPct) / 100).toFixed(2));
    // Discount applies on GST only
    const discountOnTax = Number(((grossTaxAmount * discountPct) / 100).toFixed(2));
    const netTaxAmount = Number((grossTaxAmount - discountOnTax).toFixed(2));
    const finalPrice = Number((basePrice + netTaxAmount).toFixed(2));

    group.patchValue({
      price: basePrice,
      discountAmount: discountOnTax,
      taxAmount: netTaxAmount,
      finalPrice: finalPrice
    }, { emitEvent: false });

    this.calculateTotalAmount();
  }

  // Limit decimal digits for a product field
  onProductInput(index: number, field: 'quantity' | 'unitPrice' | 'weightPerRoll', maxDecimals: number): void {
    const control = this.productsFormArray.at(index).get(field);
    if (!control) return;
    const raw = String(control.value ?? '');
    if (!raw.includes('.')) return;
    const [intPart, decPart] = raw.split('.');
    if (decPart.length > maxDecimals) {
      control.setValue(`${intPart}.${decPart.slice(0, maxDecimals)}`, { emitEvent: true });
    }
  }

  getTotalAmount(): number {
    return Math.round(this.productsFormArray.controls
      .reduce((total, group: any) => total + (group.get('finalPrice').value || 0), 0));
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
      error: (error) => {
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
      error: (error) => {
        this.snackbar.error('Failed to refresh products');
        this.isLoadingProducts = false;
      }
    });
  }

  // selectionChange handler is not required; tax is now auto-set via productId valueChanges

  private loadCustomers(): void {
    this.isLoadingCustomers = true;
    this.customerService.getCustomers({ status: 'A' }).subscribe({
      next: (response) => {
        if (response.success) {
          this.customers = response.data;
        }
        this.isLoadingCustomers = false;
      },
      error: (error) => {
        this.snackbar.error('Failed to load customers');
        this.isLoadingCustomers = false;
      }
    });
  }

  private loadTransports(): void {
    this.isLoadingTransports = true;
    this.transportMasterService.getTransports({ status: 'A' }).subscribe({
      next: (response) => {
        if (response.success) {
          this.transports = response.data;
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
    this.transportMasterService.refreshTransports().subscribe({
      next: (response) => {
        if (response.success) {
          this.transports = response.data;
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

  refreshCustomers(): void {
    this.isLoadingCustomers = true;
    this.customerService.refreshCustomers().subscribe({
      next: (response) => {
        if (response.success) {
          this.customers = response.data;
        }
        this.snackbar.success('Customers refreshed successfully');
        this.isLoadingCustomers = false;
      },
      error: (error) => {
        this.snackbar.error('Failed to load customers');
        this.isLoadingCustomers = false;
      }
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.saleForm.get(fieldName);
    return field ? field.invalid && field.touched : false;
  }

  isProductFieldInvalid(index: number, fieldName: string): boolean {
    const control = this.productsFormArray.at(index).get(fieldName);
    if (!control) return false;

    const isInvalid = control.invalid && (control.dirty || control.touched);
    
    if (isInvalid) {
      const errors = control.errors;
      if (errors) {
        if (errors['required']) return true;
        if (errors['min'] && fieldName === 'quantity') return true;
        if (errors['min'] && fieldName === 'unitPrice') return true;
        if (errors['min'] || errors['max']) return true;
        if (errors['min']) return true;
      }
    }
    
    return false;
  }

  resetForm() {
    this.initForm();
  }

  cancelEdit(): void {
    localStorage.removeItem('saleId');
    this.isEdit = false;
    this.currentSaleId = null;
    this.resetForm();
  }

  onSubmit() {
    this.markFormGroupTouched(this.saleForm);
    
    if (this.saleForm.valid) {
      this.loading = true;
      const formData = this.prepareFormData();
      this.saleService.createSale(formData).subscribe({
        next: (response: any) => {
          if (response?.success) {
            const isUpdate = Boolean(this.currentSaleId);
            this.snackbar.success(isUpdate ? 'Sale updated successfully' : 'Sale created successfully');
            if (isUpdate) {
              localStorage.removeItem('saleId');
              this.isEdit = false;
              this.currentSaleId = null;
            }
            this.resetForm();
          }
          this.loading = false;
        },
        error: (error) => {
          this.snackbar.error(error?.error?.message || 'Failed to save sale');
          this.loading = false;
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

  private prepareFormData() {
    const formValue = this.saleForm.value;
    return {
      ...formValue,
      saleDate: formatDate(formValue.saleDate, 'dd-MM-yyyy', 'en'),
      saleDiscountPercentage: Number(this.saleForm.get('saleDiscountPercentage')?.value || 0),
      items: this.productsFormArray.controls.map((control) => ({
        productId: control.get('productId')?.value,
        quantity: control.get('quantity')?.value,
        unitPrice: control.get('unitPrice')?.value,
        numberOfRoll: control.get('numberOfRoll')?.value,
        weightPerRoll: control.get('weightPerRoll')?.value,
        remarks: control.get('remarks')?.value,
        price: control.get('price')?.value,
        taxPercentage: control.get('taxPercentage')?.value,
        taxAmount: control.get('taxAmount')?.value,
        discountPrice: control.get('discountPrice')?.value,
        finalPrice: control.get('finalPrice')?.value
      })),
      isBlack: Boolean(formValue.isBlack),
      ...(this.currentSaleId ? { id: this.currentSaleId } : {})
    };
  }

  private markFormGroupTouched(formGroup: FormGroup | FormArray) {
    Object.values(formGroup.controls).forEach(control => {
      if (control instanceof FormGroup || control instanceof FormArray) {
        this.markFormGroupTouched(control);
      } else {
        control.markAsTouched();
        control.markAsDirty();
      }
    });
  }

  private calculateTotalAmount(): void {
    const controls = this.productsFormArray.controls as unknown as FormGroup[];
    const totals = controls.reduce((acc, group) => {
      const finalPrice = Number(group.get('finalPrice')?.value || 0);
      const discountAmount = Number(group.get('discountAmount')?.value || 0);
      acc.totalAmount += finalPrice;
      acc.totalDiscount += discountAmount;
      return acc;
    }, { totalAmount: 0, totalDiscount: 0 });

    this.saleForm.patchValue({ 
      totalAmount: Math.round(totals.totalAmount),
      saleDiscountAmount: Number(totals.totalDiscount.toFixed(2))
    }, { emitEvent: false });
  }

  private noDoubleQuotesValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      return control.value.includes('"') ? { doubleQuotes: true } : null;
    };
  }

  getFormattedFinalPrice(index: number): string {
    const finalPrice = this.productsFormArray.at(index).get('finalPrice')?.value;
    return finalPrice ? finalPrice.toFixed(2) : '0.00';
  }

  private fetchSaleDetails(id: number): void {
    this.saleService.getSaleDetails(id).subscribe({
      next: (response: any) => {
        console.log('response : ', response);
          if (response.id) {
            console.log('response.data : ', response.id);
            this.populateForm(response);
          }
        },
        error: (error) => {
          this.snackbar.error(error?.error?.message || 'Failed to load sale details');
        }
      });
  }

  private populateForm(data: any): void {
    this.isPopulating = true;
    this.saleForm.patchValue({
      customerId: data.customerId,
      saleDate: formatDate(new Date(data.saleDate), 'yyyy-MM-dd', 'en'),
      invoiceNumber: data.invoiceNumber,
      isBlack: data.isBlack,
      referenceName: data.referenceName || '',
      caseNumber: data.caseNumber || '',
      transportMasterId: data.transportMasterId || null,
      saleDiscountPercentage: data.saleDiscountPercentage ?? 0,
      saleDiscountAmount: data.saleDiscountAmount ?? 0
    });

    // Clear existing products and subscriptions
    this.productsFormArray.clear();
    this.productSubscriptions.forEach(sub => sub?.unsubscribe());
    this.productSubscriptions = [];

    // Populate products
    data.items.forEach((item: any) => {
      const productGroup = this.createProductFormGroup();
      productGroup.patchValue({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        finalPrice: item.finalPrice,
        discountAmount: item.discountAmount,
        discountPrice: item.discountPrice,
        taxAmount: item.taxAmount,
        price: item.price,
        taxPercentage: item.taxPercentage,
        numberOfRoll: item.numberOfRoll ?? 0,
        weightPerRoll: item.weightPerRoll ?? 0,
        remarks: item.remarks
      });
      this.productsFormArray.push(productGroup);
      // Ensure real-time calculation wiring for each populated product row
      this.setupProductCalculations(productGroup, this.productsFormArray.length - 1);
    });
    // Compute totals based on provided values only
    this.calculateTotalAmount();
    this.isEdit = true;
    this.isPopulating = false;
  }

}

