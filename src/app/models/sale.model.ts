export interface Sale {
  id?: number;
  purchaseId: number;
  productId?: number;
  productName?: string;
  categoryId?: number;
  categoryName?: string;
  quantity: number;
  unitPrice: number;
  saleDate: string;
  isBlack: boolean;
  invoiceNumber?: string;
  customerName?: string;
  totalSaleAmount?: number;
  totalProducts?: number;
  totalQuantity?: number;
  salesDate?: string;
  otherExpenses?: number;
  totalAmount?: number;
}

export interface SaleSearchRequest {
  currentPage: number;
  perPageRecord: number;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export interface SaleResponse {
  success: boolean;
  message: string;
  data: {
    content: Sale[];
    totalElements: number;
    totalPages: number;
  };
}