export interface EmployeeWithdrawSearchRequest {
  employeeId?: number | '';
  search?: string;
  currentPage: number;
  perPageRecord: number;
}

export interface EmployeeWithdrawSearchItem {
  id: number;
  employeeName: string;
  employeeId: number;
  withdrawDate: string;
  payment: number;
  createdAt?: string;
}

export interface EmployeeWithdrawSearchResponse {
  success: boolean;
  message: string;
  data: {
    content: EmployeeWithdrawSearchItem[];
    pageable: {
      pageNumber: number;
      pageSize: number;
    };
    totalElements: number;
    totalPages: number;
  };
}

export interface EmployeeWithdrawDetailRequest {
  id: number;
}

export interface EmployeeWithdrawDetailResponse {
  success: boolean;
  message: string;
  data: {
    id: number;
    employeeId: number;
    employeeName: string;
    payment: number;
    withdrawDate: string;
  };
}

export interface EmployeeWithdrawCreateRequest {
  employeeId: number;
  payment: number;
  withdrawDate: string; // dd-MM-yyyy as per API
}

export interface EmployeeWithdrawUpdateRequest extends EmployeeWithdrawCreateRequest {
  id: number;
}

export interface ApiBaseResponse {
  success: boolean;
  message: string;
}


