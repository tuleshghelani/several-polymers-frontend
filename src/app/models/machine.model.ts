export interface Machine {
  id: number;
  name: string;
  status: string; // 'A' | 'I'
}

export interface MachineSearchRequest {
  search?: string;
  page: number;
  size: number;
  sortBy?: string;
  sortDir?: string;
}

export interface MachineSearchResponse {
  success: boolean;
  message: string;
  data: {
    content: Machine[];
    totalElements: number;
    totalPages: number;
    page?: number;
    size?: number;
  };
}

export interface MachineDetailResponse {
  success: boolean;
  message: string;
  data: Machine;
}

