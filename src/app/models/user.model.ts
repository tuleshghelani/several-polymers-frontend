export interface User {
  id?: number;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
  password?: string;
  status: string;
  roles: string[];
  clientId?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserSearchRequest {
  searchTerm?: string;
  status?: string;
  page: number;
  size: number;
  sortBy?: string;
  sortDirection?: string;
}

export interface UserResponse {
  success: boolean;
  message: string;
  data: {
    content: User[];
    totalElements: number;
    totalPages: number;
    currentPage: number;
    size: number;
  };
}

export interface UserCreateRequest {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
  password: string;
  status: string;
  roles: string[];
  clientId: number;
}

export interface UserUpdateRequest {
  id: number;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
  status: string;
  roles: string[];
}

export interface PasswordUpdateRequest {
  id: number;
  password: string;
  confirmPassword: string;
}

export interface UserDetailResponse {
  success: boolean;
  message: string;
  data: User;
}
