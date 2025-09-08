import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, ValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil, Subscription } from 'rxjs';
import { formatDate } from '@angular/common';
import { HttpClient } from '@angular/common/http';

import { ProductService } from '../../services/product.service';
import { PurchaseService } from '../../services/purchase.service';
import { CustomerService } from '../../services/customer.service';
import { SnackbarService } from '../../shared/services/snackbar.service';
import { LoaderComponent } from '../../shared/components/loader/loader.component';
import { SearchableSelectComponent } from '../../shared/components/searchable-select/searchable-select.component';
import { EncryptionService } from '../../shared/services/encryption.service';

interface ProductForm {
  productId: string;
  quantity: number;
  coilNumber: string;
  unitPrice: number;
  finalPrice: number;
  remarks: string
}

@Component({
  selector: 'app-add-purchase',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LoaderComponent,
    SearchableSelectComponent
  ],
  templateUrl: './add-purchase.component.html',
  styleUrls: ['./add-purchase.component.scss']
})
export class AddPurchaseComponent implements OnInit, OnDestroy {
  purchaseForm!: FormGroup;
  products: any[] = [];
  customers: any[] = [];
  loading = false;
  isLoadingProducts = false;
  isLoadingCustomers = false;
  isEdit = false;
  private destroy$ = new Subject<void>();
  private productSubscriptions: Subscription[] = [];

  get productsFormArray() {
    return this.purchaseForm.get('products') as FormArray;
  }

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private customerService: CustomerService,
    private purchaseService: PurchaseService,
    private snackbar: SnackbarService,
    private http: HttpClient,
    private router: Router,
    private encryptionService: EncryptionService
  ) {
    this.initForm();
  }

  ngOnInit() {
    this.loadProducts();
    this.loadCustomers();
    
    const encryptedId = localStorage.getItem('purchaseId');
    if (encryptedId) {
      const purchaseId = this.encryptionService.decrypt(encryptedId);
      if (purchaseId) {
        this.fetchPurchaseDetails(Number(purchaseId));
      }
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.productSubscriptions.forEach(sub => sub?.unsubscribe());
  }

  private initForm() {
    this.purchaseForm = this.fb.group({
      customerId: ['', Validators.required],
      purchaseDate: [formatDate(new Date(), 'yyyy-MM-dd', 'en'), Validators.required],
      invoiceNumber: ['', Validators.required],
      products: this.fb.array([])
    });

    // Add initial product form group
    this.addProduct();
  }

  private createProductFormGroup(): FormGroup {
    return this.fb.group({
      productId: ['', Validators.required],
      quantity: ['', [Validators.required, Validators.min(1)]],
      coilNumber: ['', [this.noDoubleQuotesValidator()]],
      unitPrice: ['', [Validators.required, Validators.min(0.01)]],
      finalPrice: [{ value: 0, disabled: true }],
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
    const subscription = group.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.calculateProductPrice(index);
      });
    this.productSubscriptions[index] = subscription;
  }

  private calculateProductPrice(index: number): void {
    const group = this.productsFormArray.at(index) as FormGroup;
    if (!group) return;

    const quantity = Number(group.get('quantity')?.value || 0);
    const unitPrice = Number(group.get('unitPrice')?.value || 0);
    const finalPrice = Number((quantity * unitPrice).toFixed(2));

    group.patchValue({
      finalPrice: finalPrice
    }, { emitEvent: false });

    this.calculateTotalAmount();
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
    const field = this.purchaseForm.get(fieldName);
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

  onSubmit() {
    this.markFormGroupTouched(this.purchaseForm);
    
    if (this.purchaseForm.valid) {
      this.loading = true;
      const formData = this.preparePurchaseData();
      this.purchaseService.createPurchase(formData).subscribe({
        next: (response: any) => {
          if (response?.success) {
            this.snackbar.success('Purchase created successfully');
            this.resetForm();
          }
          this.loading = false;
        },
        error: (error) => {
          this.snackbar.error(error?.error?.message || 'Failed to create purchase');
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

  private preparePurchaseData() {
    const formValue = this.purchaseForm.value;
    return {
      ...formValue,
      purchaseDate: formatDate(formValue.purchaseDate, 'dd-MM-yyyy', 'en'),
      products: formValue.products.map((product: ProductForm) => ({
        ...product,
        finalPrice: this.productsFormArray.at(formValue.products.indexOf(product)).get('finalPrice')?.value
      }))
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
    const total = this.productsFormArray.controls
      .reduce((sum, group: any) => sum + (group.get('finalPrice').value || 0), 0);
      
    this.purchaseForm.patchValue({ totalAmount: total }, { emitEvent: false });
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

  private fetchPurchaseDetails(id: number): void {
    this.purchaseService.getPurchaseDetails(id).subscribe({
      next: (response: any) => {
        console.log('response : ', response);
          if (response.id) {
            console.log('response.data : ', response.id);
            this.populateForm(response);
          }
        },
        error: (error) => {
          this.snackbar.error(error?.error?.message || 'Failed to load purchase details');
        }
      });
  }

  private populateForm(data: any): void {
    this.purchaseForm.patchValue({
      customerId: data.customerId,
      purchaseDate: formatDate(new Date(data.purchaseDate), 'yyyy-MM-dd', 'en'),
      invoiceNumber: data.invoiceNumber,
    });

    // Clear existing products
    this.productsFormArray.clear();

    // Populate products
    data.items.forEach((item: any) => {
      const productGroup = this.createProductFormGroup();
      productGroup.patchValue({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        finalPrice: item.finalPrice,
        coilNumber: item.coilNumber,
        remarks: item.remarks
      });
      this.productsFormArray.push(productGroup);
    });
    this.isEdit = true;
  }

}
