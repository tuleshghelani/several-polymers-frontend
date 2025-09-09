
export interface Product {
  id?: number;
  name: string;
  categoryId: number;
  categoryName?: string;
  description: string;
  minimumStock: number;
  remainingQuantity?: number;
  purchaseAmount?: number;
  saleAmount?: number;
  measurement?: string;
  status: 'A' | 'I';
  blockedQuantity?: number;
  totalRemainingQuantity?: number;
  createdAt?: string;
  updatedAt?: string;
  weight: number;
  taxPercentage?: number;
}

export interface ProductSearchRequest {
  search?: string;
  categoryId?: number;
  status?: string;
  size?: number;
  page?: number;
}

export interface ProductResponse {
  success: boolean;
  message: string;
  data: {
    content: Product[];
    totalElements: number;
    totalPages: number;
  };
}