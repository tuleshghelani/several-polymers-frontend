import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { CustomerService } from '../../services/customer.service';
import { Customer, CustomerSearchRequest } from '../../models/customer.model';
import { ToastrService } from 'ngx-toastr';
import { RouterModule } from '@angular/router';
import { CustomerModalComponent } from '../customer-modal/customer-modal.component';
import { ModalService } from '../../services/modal.service';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-customer',
  templateUrl: './customer.component.html',
  styleUrls: ['./customer.component.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule, 
    CustomerModalComponent, PaginationComponent]
})
export class CustomerComponent implements OnInit {
  customers: Customer[] = [];
  searchForm!: FormGroup;
  isLoading = false;
  displayModal = false;
  
  // Pagination properties
  currentPage = 0;
  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50, 100];
  totalPages = 0;
  totalElements = 0;
  startIndex = 0;
  endIndex = 0;

  constructor(
    private customerService: CustomerService,
    private fb: FormBuilder,
    private toastr: ToastrService,
    public modalService: ModalService
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadCustomers();
  }

  private initializeForm(): void {
    this.searchForm = this.fb.group({
      search: [''],
      startDate: [''],
      endDate: ['']
    });
  }

  private formatDateForApi(dateStr: string, isStartDate: boolean): string {
    if (!dateStr) return '';
    
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';

    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const time = isStartDate ? '00:00:00' : '23:59:59';

    return `${day}-${month}-${year} ${time}`;
  }

  loadCustomers(): void {
    this.isLoading = true;
    const formValues = this.searchForm.value;
    
    const params: CustomerSearchRequest = {
      currentPage: this.currentPage,
      perPageRecord: this.pageSize,
      search: formValues.search || ''
    };

    // Add dates if they are selected
    if (formValues.startDate) {
      params.startDate = this.formatDateForApi(formValues.startDate, true);
    }
    if (formValues.endDate) {
      params.endDate = this.formatDateForApi(formValues.endDate, false);
    }

    this.customerService.searchCustomers(params).subscribe({
      next: (response) => {
        if (response.success) {
          this.customers = response.data.content;
          this.totalPages = response.data.totalPages;
          this.totalElements = response.data.totalElements;
        }
        this.isLoading = false;
      },
      error: () => {
        this.toastr.error('Failed to load customers');
        this.isLoading = false;
      }
    });
  }

  onSearch(): void {
    this.currentPage = 0;
    this.loadCustomers();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadCustomers();
  }

  onPageSizeChange(newSize: number): void {
    this.pageSize = newSize;
    this.currentPage = 0;
    this.loadCustomers();
  }

  // Update the openCustomerModal method
  openCustomerModal(customer?: Customer) {
    this.modalService.open('customer', customer);
    // Subscribe to modal state changes
    this.modalService.modalState$.subscribe(state => {
      if (!state.isOpen) {
        // When modal closes, reload customers
        // this.loadCustomers();
      }
    });
  }

  resetForm(): void {
    this.searchForm.reset();
    this.currentPage = 0;
    this.loadCustomers();
  }
}
