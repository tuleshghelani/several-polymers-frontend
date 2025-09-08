import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, FormControl, AbstractControl, ValidatorFn, ValidationErrors, FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil, Subscription, finalize, debounceTime, filter, distinctUntilChanged } from 'rxjs';
import { formatDate } from '@angular/common';
import { Dialog, DialogRef } from '@angular/cdk/dialog';
import { EncryptionService } from '../../../shared/services/encryption.service';
import { ProductService } from '../../../services/product.service';
import { CustomerService } from '../../../services/customer.service';
import { SnackbarService } from '../../../shared/services/snackbar.service';
import { QuotationService } from '../../../services/quotation.service';
import { PriceService } from '../../../services/price.service';
import { SearchableSelectComponent } from "../../../shared/components/searchable-select/searchable-select.component";
import { MatDialogModule } from '@angular/material/dialog';
import { SaleModalComponent } from '../../sale-modal/sale-modal.component';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';

@Component({
  standalone: true,
  selector: 'app-add-quotation',
  templateUrl: './add-quotation.component.html',
  styleUrl: './add-quotation.component.scss',
  imports: [SearchableSelectComponent, 
    CommonModule, 
    ReactiveFormsModule, 
    FormsModule, 
    RouterModule, MatDialogModule, SaleModalComponent, LoaderComponent, PaginationComponent]
})
export class AddQuotationComponent implements OnInit, OnDestroy {
  quotationForm!: FormGroup;
  createQuotationForm!: FormGroup;
  products: any[] = [];
  customers: any[] = [];
  loading = false;
  isLoadingProducts = false;
  isLoadingCustomers = false;
  minValidUntilDate: string;
  private destroy$ = new Subject<void>();
  isLoading = false;
  isEdit = false;
  quotationId?: number;
  selectedProduct!: string
  totals: { price: number; tax: number; finalPrice: number; taxPercentage: number; afterQuotationDiscount: number; quotationDiscountAmount: number } = {
    price: 0,
    tax: 0,
    finalPrice: 0,
    taxPercentage: 0,
    afterQuotationDiscount: 0,
    quotationDiscountAmount: 0
  };
  private itemSubscriptions: Subscription[] = [];
  private productPriceCache: Map<string, number> = new Map();
  isLoadingPrices = false;
  loadingPriceIndex: number | null = null;

  get itemsFormArray() {
    return this.quotationForm.get('items') as FormArray;
  }

  constructor(
    private fb: FormBuilder,
    private quotationService: QuotationService,
    private productService: ProductService,
    private customerService: CustomerService,
    private priceService: PriceService,
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
    this.setupCustomerNameSync();
    this.setupCustomerChangeListener();
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
      contactNumber: ['', Validators.required],
      quoteDate: [formatDate(today, 'yyyy-MM-dd', 'en')],
      validUntil: [formatDate(validUntil, 'yyyy-MM-dd', 'en'), [Validators.required]],
      remarks: [''],
      termsConditions: [''],
      items: this.fb.array([]),
      address: [''],
      quotationDiscountPercentage: [0, [Validators.required, Validators.min(0), Validators.max(100)]]
    });

    this.addItem(true);
    
    this.quotationForm.get('quotationDiscountPercentage')?.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(100)
      )
      .subscribe(newValue => {
        console.log('Quotation discount percentage changed to:', newValue);
        this.itemsFormArray.controls.forEach((_, index) => {
          this.calculateItemPrice(index);
        });
        this.calculateTotalAmount();
        this.cdr.detectChanges();
      });
  }

  private createItemFormGroup(initialData?: any): FormGroup {
    return this.fb.group({
      productId: [initialData?.productId || '', Validators.required],
      productType: [initialData?.productType || ''],
      quantity: [initialData?.quantity || 1, [Validators.required, Validators.min(1)]],
      unitPrice: [initialData?.unitPrice || 0, [Validators.required, Validators.min(0.01)]],
      discountPercentage: [initialData?.discountPercentage || 0, [Validators.required, Validators.min(0), Validators.max(100)]],
      price: [initialData?.price || 0],
      taxPercentage: [{ value: initialData?.taxPercentage || 18 }],
      taxAmount: [{ value: initialData?.taxAmount || 0, disabled: true }],
      finalPrice: [{ value: initialData?.finalPrice || 0, disabled: true }],
      quotationDiscountAmount: [{ value: initialData?.quotationDiscountAmount || 0, disabled: true }],
      calculations: [initialData?.calculations || []]
    });
  }

  private feetInchValidator(calculationType: string): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
      if(calculationType === 'SQ_FEET'){
        const feet = group.get('feet')?.value || 0;
        const inch = group.get('inch')?.value
        if (feet === 0 && inch === 0) {
          return { bothZero: true };
        }
      }

      if(calculationType === 'MM'){
        const mm = group.get('mm')?.value || 0;
        if (mm === 0){
          return { mmZero: true };
        }
      }
      return null;
    };
  }


  createCalculationGroup(item: any, calculationType: string): FormGroup {
    console.log('createCalculationGroup item : ', item);
    return this.fb.group({
      mm: [item.mm, calculationType === 'MM' ? Validators.required : null],
      feet: [item.feet],
      nos: [item.nos, Validators.required],
      weight: [item.weight, Validators.required],
      id: [item?.id],
      inch: [item.inch],
      sqFeet: [item.sqFeet, Validators.required],
      runningFeet: [item.runningFeet, Validators.required]
    }, { validators: this.feetInchValidator(calculationType) });
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
          }
        }
      });
  }

  addItem(isInitializing = false): void {
    const itemGroup = this.fb.group({
      productId: ['', Validators.required],
      productType: [''],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unitPrice: [0, [Validators.required, Validators.min(0.01)]],
      discountPercentage: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
      price: [0],
      taxPercentage: [18],
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
    this.calculateTotalAmount();
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

    this.calculateTotalAmount();
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
        console.log('Product ID changed to:', productId);
        const selectedProduct = this.products.find(p => p.id === productId);
        console.log('selectedProduct >>>', selectedProduct);
        
        if (selectedProduct) {
          console.log(`Product tax percentage: ${selectedProduct.tax_percentage !== undefined ? selectedProduct.tax_percentage : 'not specified, using default 18'}%`);
          this.fetchProductPrice(index, selectedProduct);
        }
      });
  }

  private calculateItemPrice(index: number, skipChangeDetection = false): void {
    const group = this.itemsFormArray.at(index) as FormGroup;
    
    const values = {
      quantity: Number(Number(group.get('quantity')?.value || 0).toFixed(3)),
      unitPrice: Number(Number(group.get('unitPrice')?.value || 0).toFixed(2)),
      discountPercentage: Number(Number(group.get('discountPercentage')?.value || 0).toFixed(2)),
      taxPercentage: Number(group.get('taxPercentage')?.value || 18)
    };

    const quotationDiscountPercentage = Number(Number(this.quotationForm.get('quotationDiscountPercentage')?.value || 0).toFixed(2));

    console.log(`Tax percentage used for calculation: ${values.taxPercentage}%`);
    console.log(`Quotation discount percentage: ${quotationDiscountPercentage}%`);

    const basePrice = Number((values.quantity * values.unitPrice).toFixed(2));
    const itemDiscountAmount = Number(((basePrice * values.discountPercentage) / 100).toFixed(2));
    const afterItemDiscount = Number((basePrice - itemDiscountAmount).toFixed(2));
    
    const quotationDiscountAmount = Number(((afterItemDiscount * quotationDiscountPercentage) / 100).toFixed(2));
    const afterQuotationDiscount = Number((afterItemDiscount - quotationDiscountAmount).toFixed(2));
    
    const taxAmount = Number(((afterQuotationDiscount * values.taxPercentage) / 100).toFixed(2));
    const finalPrice = Number((afterQuotationDiscount + taxAmount).toFixed(2));

    group.patchValue({
      price: afterItemDiscount,
      quotationDiscountAmount: quotationDiscountAmount,
      taxAmount: taxAmount,
      finalPrice: finalPrice
    }, { emitEvent: false });

    console.log(`Item ${index} calculated:`, {
      basePrice,
      itemDiscountAmount,
      afterItemDiscount,
      quotationDiscountPercentage,
      quotationDiscountAmount,
      afterQuotationDiscount,
      taxAmount,
      finalPrice
    });

    this.calculateTotalAmount();
    
    if (!skipChangeDetection) {
      this.cdr.detectChanges();
    }
  }

  getTotalAmount(): number {
    return Math.round(this.itemsFormArray.controls
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
      error: (error) => {
        this.snackbar.error('Failed to refresh customers');
        this.isLoadingCustomers = false;
      }
    });
  }

  private calculateTotalAmount(): void {
    const totals = {
      price: 0,
      tax: 0,
      finalPrice: 0,
      taxAmount: 0,
      taxPercentage: 0,
      quotationDiscountAmount: 0
    };

    this.itemsFormArray.controls.forEach((group: AbstractControl) => {
      const price = Number(Number(group.get('price')?.value || 0).toFixed(2));
      const finalPrice = Number(Number(group.get('finalPrice')?.value || 0).toFixed(2));
      const taxAmount = Number(Number(group.get('taxAmount')?.value || 0).toFixed(2));
      const taxPercentage = Number(group.get('taxPercentage')?.value || 18);
      const quotationDiscountAmount = Number(Number(group.get('quotationDiscountAmount')?.value || 0).toFixed(2));

      totals.price = Number((totals.price + price).toFixed(2));
      totals.tax = Number((totals.tax + taxAmount).toFixed(2));
      totals.finalPrice = Number((totals.finalPrice + finalPrice).toFixed(2));
      totals.taxAmount = Number((totals.taxAmount + taxAmount).toFixed(2));
      totals.taxPercentage = Number(taxPercentage);
      totals.quotationDiscountAmount = Number((totals.quotationDiscountAmount + quotationDiscountAmount).toFixed(2));
    });

    const quotationDiscountPercentage = Number(Number(this.quotationForm.get('quotationDiscountPercentage')?.value || 0).toFixed(2));
    const afterQuotationDiscount = Number((totals.price - totals.quotationDiscountAmount).toFixed(2));

    this.totals = {
      price: totals.price,
      tax: totals.tax,
      finalPrice: totals.finalPrice,
      taxPercentage: totals.taxPercentage,
      afterQuotationDiscount: afterQuotationDiscount,
      quotationDiscountAmount: totals.quotationDiscountAmount
    };
  }

  resetForm(): void {
    const today = new Date();
    const validUntil = new Date();
    validUntil.setDate(today.getDate() + 7);

    this.quotationForm.reset({
      quoteDate: formatDate(today, 'yyyy-MM-dd', 'en'),
      validUntil: formatDate(validUntil, 'yyyy-MM-dd', 'en'),
      remarks: '',
      termsConditions: '',
      quotationDiscountPercentage: 0
    });

    while (this.itemsFormArray.length) {
      this.itemsFormArray.removeAt(0);
    }
    this.addItem();
    
    this.calculateTotalAmount();
    this.cdr.detectChanges();
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.quotationForm.get(fieldName);
    return field ? field.invalid && (field.dirty || field.touched) : false;
  }

  isItemFieldInvalid(index: number, fieldName: string): boolean {
    const control = this.itemsFormArray.at(index).get(fieldName);
    if (!control) return false;

    const isInvalid = control.invalid && (control.dirty || control.touched);

    if (isInvalid) {
      const errors = control.errors;
      if (errors) {
        if (errors['required']) return true;
        if (errors['min'] && fieldName === 'quantity') return true;
        if (errors['min'] && fieldName === 'unitPrice') return true;
        if ((errors['min'] || errors['max']) &&
          (fieldName === 'discountPercentage')) return true;
      }
    }

    return false;
  }

  getFieldError(fieldName: string): string {
    const control = this.quotationForm.get(fieldName);
    if (control?.errors) {
      if (control.errors['required']) return `${fieldName} is required`;
      if (control.errors['min']) return `${fieldName} must be greater than ${control.errors['min'].min}`;
      if (control.errors['max']) return `${fieldName} must be less than ${control.errors['max'].max}`;
    }
    return '';
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

  onProductSelect(index: number, event: any): void {
    const selectedProduct = this.products.find(p => p.id === event.value);
    if (!selectedProduct) {
      console.warn('No product found with ID:', event.value);
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

  private fetchProductPrice(index: number, selectedProduct: any): void {
    console.log('Fetching price for product:', selectedProduct.name);
    
    const itemGroup = this.itemsFormArray.at(index);
    
    const taxPercentage = selectedProduct.tax_percentage !== undefined ? 
                        selectedProduct.tax_percentage : 18;
    
    console.log(`Setting tax percentage for ${selectedProduct.name}: ${taxPercentage}%`);
    
    itemGroup.patchValue({
      productType: selectedProduct.type,
      taxPercentage: taxPercentage,
      quantity: selectedProduct.quantity || 1
    }, { emitEvent: false });

    const customerId = this.quotationForm.get('customerId')?.value;
    
    if (customerId) {
      const cacheKey = `${customerId}-${selectedProduct.id}`;
      
      if (this.productPriceCache.has(cacheKey)) {
        itemGroup.patchValue({
          unitPrice: this.productPriceCache.get(cacheKey)
        }, { emitEvent: true });
        return;
      }
      
      this.isLoadingPrices = true;
      this.loadingPriceIndex = index;
      
      this.priceService.getLatestPrices({
        productId: selectedProduct.id,
        customerId: customerId
      })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoadingPrices = false;
          this.loadingPriceIndex = null;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          if (response.success) {
            const price = response.data.lastSalePrice || selectedProduct.sale_amount || 0;
            
            this.productPriceCache.set(cacheKey, price);
            
            itemGroup.patchValue({
              unitPrice: price
            }, { emitEvent: true });
          } else {
            itemGroup.patchValue({
              unitPrice: selectedProduct.sale_amount || 0
            }, { emitEvent: true });
          }
        },
        error: (error) => {
          console.error('Error fetching latest price:', error);
          this.snackbar.error('Failed to fetch latest prices');
          
          const price = selectedProduct.sale_amount || 0;
          this.productPriceCache.set(cacheKey, price);
          
          itemGroup.patchValue({
            unitPrice: price
          }, { emitEvent: true });
        }
      });
    } else {
      itemGroup.patchValue({
        unitPrice: selectedProduct.sale_amount || 0
      }, { emitEvent: true });
    }
  }

  validateDates(): void {
    const quoteDate = this.quotationForm.get('quoteDate')?.value;
    const validUntil = this.quotationForm.get('validUntil')?.value;

    if (quoteDate && validUntil && new Date(validUntil) < new Date(quoteDate)) {
      this.quotationForm.get('validUntil')?.setErrors({ invalidDate: true });
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
            console.log('edit response >>',response.data)
            this.populateForm(response.data);
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading quotation details:', error);
          this.snackbar.error('Failed to load quotation details');
          this.isLoading = false;
          localStorage.removeItem('editQuotationId');
        }
      });
    } catch (error) {
      console.error('Decryption error:', error);
      localStorage.removeItem('editQuotationId');
    }
  }

  async populateForm(data: any) {
    if (!data) return;

    console.log('Populating form with data:', data);

    while (this.itemsFormArray.length) {
      this.itemsFormArray.removeAt(0);
    }

    this.quotationForm.patchValue({
      customerName: data.customerName,
      customerId: data.customerId,
      quoteDate: data.quoteDate,
      validUntil: data.validUntil,
      remarks: data.remarks || '',
      termsConditions: data.termsConditions || '',
      address: data.address,
      contactNumber: data.contactNumber,
      quotationDiscountPercentage: data.quotationDiscountPercentage || data.quotationDiscount || 0
    });

    if (data.items && Array.isArray(data.items)) {
      data.items.forEach((item: any) => {
        const product = this.products.find(p => p.id === item.productId);
        const taxPercentage = product?.tax_percentage !== undefined 
          ? product.tax_percentage 
          : (item.taxPercentage || 18);

        console.log(`Loaded item ${item.productId} with tax percentage: ${taxPercentage}%`);
        
        const itemGroup = this.fb.group({
          productId: [item.productId || '', Validators.required],
          productType: [item.productType || ''],
          quantity: [item.quantity || 1, [Validators.required, Validators.min(1)]],
          unitPrice: [item.unitPrice || 0, [Validators.required, Validators.min(0.01)]],
          discountPercentage: [item.discountPercentage || 0, [Validators.required, Validators.min(0), Validators.max(100)]],
          price: [item.price || 0],
          taxPercentage: [taxPercentage],
          taxAmount: [item.taxAmount || 0],
          finalPrice: [item.finalPrice || 0],
          quotationDiscountAmount: [item.quotationDiscountAmount || 0],
          calculations: [item.calculations || []]
        });
        
        this.setupItemCalculations(itemGroup, this.itemsFormArray.length);
        this.itemsFormArray.push(itemGroup);
      });
    }
    
    this.itemsFormArray.controls.forEach((_, index) => {
      this.calculateItemPrice(index);
    });
    
    this.calculateTotalAmount();
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
    
    const quotationDiscountPercentageControl = this.quotationForm.get('quotationDiscountPercentage');
    const quotationDiscountPercentage = Number(quotationDiscountPercentageControl?.value || 0);
    
    console.log('Explicitly getting quotationDiscountPercentage:', quotationDiscountPercentage);
    
    const items = this.itemsFormArray.controls.map((control) => {
      return {
        productId: control.get('productId')?.value,
        productType: control.get('productType')?.value,
        quantity: control.get('quantity')?.value,
        unitPrice: control.get('unitPrice')?.value,
        discountPercentage: control.get('discountPercentage')?.value,
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
      contactNumber: formValue.contactNumber,
      quoteDate: formatDate(formValue.quoteDate, 'yyyy-MM-dd', 'en'),
      validUntil: formatDate(formValue.validUntil, 'yyyy-MM-dd', 'en'),
      remarks: formValue.remarks,
      termsConditions: formValue.termsConditions,
      address: formValue.address,
      quotationDiscountPercentage: quotationDiscountPercentage,
      items: items
    };
    
    console.log('Final form data to be submitted:', finalFormData);
    
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
  }

  private setupCustomerChangeListener(): void {
    this.quotationForm.get('customerId')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.productPriceCache.clear();
      });
  }

  onQuotationDiscountPercentageChange(event: any): void {
    console.log('Quotation discount percentage changed to:', event.target.value);
    
    const newValue = Number(event.target.value || 0);
    
    this.quotationForm.get('quotationDiscountPercentage')?.setValue(newValue, { emitEvent: false });
    
    this.itemsFormArray.controls.forEach((_, index) => {
      this.calculateItemPrice(index);
    });
    
    this.calculateTotalAmount();
    
    this.cdr.detectChanges();
  }

}

