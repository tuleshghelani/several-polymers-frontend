import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AttendanceService } from '../../../services/attendance.service';
import { EmployeeService } from '../../../services/employee.service';
import { SnackbarService } from '../../../shared/services/snackbar.service';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterModule } from '@angular/router';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { SearchableSelectComponent } from '../../../shared/components/searchable-select/searchable-select.component';

interface AttendanceRecord {
  id: number;
  startDateTime: string;
  endDateTime: string;
  regularHours: number;
  overtimeHours: number;
  regularPay: number;
  overtimePay: number;
  totalPay: number;
  remarks: string;
  shift: string;
  createdAt: string;
  employee: {
    id: number;
    name: string;
    mobileNumber: string;
    email: string;
    designation: string;
    department: string;
    status: string;
    wageType: string;
    regularHours: number;
    regularPay: number;
    overtimePay: number;
  };
  createdByName: string;
  createdById: number;
  clientId: number;
}

interface AttendanceListResponse {
  success: boolean;
  message: string;
  data: {
    content: AttendanceRecord[];
    currentPage: number;
    pageSize: number;
    totalElements: number;
    totalPages: number;
    isFirst: boolean;
    isLast: boolean;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

@Component({
  selector: 'app-all-attendance',
  templateUrl: './all-attendance.component.html',
  styleUrls: ['./all-attendance.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    FormsModule,
    LoaderComponent,
    RouterLink,
    PaginationComponent,
    SearchableSelectComponent
  ]
})
export class AllAttendanceComponent implements OnInit {
  searchForm!: FormGroup;
  attendanceRecords: AttendanceRecord[] = [];
  employees: any[] = [];
  isLoading = false;

  // Pagination properties
  currentPage = 0;
  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50, 100];
  totalPages = 0;
  totalElements = 0;
  startIndex = 0;
  endIndex = 0;

  // Shift options
  shiftOptions = [
    { value: '', label: 'All Shifts' },
    { value: 'D', label: 'Day Shift' },
    { value: 'N', label: 'Night Shift' }
  ];

  constructor(
    private fb: FormBuilder,
    private attendanceService: AttendanceService,
    private employeeService: EmployeeService,
    private snackbar: SnackbarService
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadEmployees();
    this.loadAttendanceRecords();
  }

  private initializeForm(): void {
    // Get current month's start and end dates
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    this.searchForm = this.fb.group({
      employeeId: [''],
      startDate: [this.formatDate(firstDay)],
      endDate: [this.formatDate(lastDay)],
      shift: ['']
    });
  }

  private formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }

  private formatDateForDisplay(dateString: string): string {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}-${month}-${year} ${hours}:${minutes}`;
  }

  loadEmployees(): void {
    const params = {
      page: 0,
      size: 1000,
      search: ''
    };

    this.employeeService.searchEmployees(params).subscribe({
      next: (response) => {
        if (response.success) {
          this.employees = response.data.content.map((emp: any) => ({
            value: emp.id,
            label: `${emp.name} (${emp.mobileNumber})`
          }));
        }
      },
      error: (error) => {
        console.error('Failed to load employees:', error);
      }
    });
  }

  loadAttendanceRecords(): void {
    this.isLoading = true;
    
    const formValue = this.searchForm.value;
    const params: any = {
      page: this.currentPage,
      size: this.pageSize,
      sortBy: 'id',
      sortDir: 'desc'
    };

    // Add optional filters only if they have values
    if (formValue.employeeId) {
      params.employeeId = formValue.employeeId;
    }
    if (formValue.startDate) {
      params.startDate = formValue.startDate;
    }
    if (formValue.endDate) {
      params.endDate = formValue.endDate;
    }
    if (formValue.shift) {
      params.shift = formValue.shift;
    }

    this.attendanceService.listAttendance(params).subscribe({
      next: (response: AttendanceListResponse) => {
        if (response.success) {
          this.attendanceRecords = response.data.content;
          this.totalPages = response.data.totalPages;
          this.totalElements = response.data.totalElements;
          this.currentPage = response.data.currentPage;
          this.updatePaginationIndexes();
        } else {
          this.snackbar.error(response.message || 'Failed to load attendance records');
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.snackbar.error(error?.error?.message || 'Failed to load attendance records');
        this.isLoading = false;
      }
    });
  }

  onSearch(): void {
    this.currentPage = 0;
    this.loadAttendanceRecords();
  }

  resetForm(): void {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    this.searchForm.patchValue({
      employeeId: '',
      startDate: this.formatDate(firstDay),
      endDate: this.formatDate(lastDay),
      shift: ''
    });
    
    this.currentPage = 0;
    this.pageSize = 10;
    this.loadAttendanceRecords();
  }

  onPageSizeChange(newSize: number): void {
    this.pageSize = newSize;
    this.currentPage = 0;
    this.loadAttendanceRecords();
  }

  onPageChange(page: number): void {
    if (page >= 0 && page < this.totalPages) {
      this.currentPage = page;
      this.loadAttendanceRecords();
    }
  }

  private updatePaginationIndexes(): void {
    this.startIndex = this.currentPage * this.pageSize + 1;
    this.endIndex = Math.min(this.startIndex + this.pageSize - 1, this.totalElements);
  }
  
  openWhatsApp(rawNumber: string | number | null | undefined): void {
    const digits = String(rawNumber ?? '').replace(/\D/g, '');
    if (!digits) {
      return;
    }
    const normalized = digits.length === 10 ? `91${digits}` : digits;
    const url = `whatsapp://send?phone=${normalized}`;
    try {
      // Attempt to open native WhatsApp app via custom protocol
      window.location.href = url;
    } catch {
      // Swallow errors; native handlers may block exceptions
    }
  }

  getShiftLabel(shift: string): string {
    const shiftMap: { [key: string]: string } = {
      'D': 'Day',
      'N': 'Night'
    };
    return shiftMap[shift] || shift;
  }

  getShiftClass(shift: string): string {
    return shift === 'D' ? 'day-shift' : 'night-shift';
  }

  formatDateTime(dateString: string): string {
    return this.formatDateForDisplay(dateString);
  }

  formatCurrency(amount: number): string {
    return '₹' + amount.toFixed(2);
  }

  formatHours(hours: number): string {
    return hours.toFixed(2) + ' hrs';
  }
}
