export enum QuotationStatus {
    Q = 'Quote',
    A = 'Accepted',
    D = 'Declined',
    R = 'Ready',
    P = 'Processing',
    PC = 'Packaging',
    C = 'Completed',
    I = 'Invoiced'
  }
  
  export interface QuotationItem {
    productId: number;
    quantity: number;
    unitPrice: number;
    taxPercentage: number;
    numberOfRoll?: number;
    weightPerRoll?: number;
    brandId?: number;
    remarks?: string;
    finalPrice?: number;
    status?: string;
    price?: number;
    taxAmount?: number;
    quotationDiscountAmount?: number;
  }
  
  export interface CreateQuotationRequest {
    customerId?: number;
    customerName: string;
    quoteDate: string;
    validUntil: string;
    remarks?: string;
    termsConditions?: string;
    transportMasterId?: number;
    caseNumber?: string;
    packagingAndForwadingCharges?: number;
    address?: string;
    contactNumber?: string;
    quotationDiscountPercentage?: number;
    items: QuotationItem[];
  }
  
  export interface QuotationResponse {
    success: boolean;
    message: string;
  }
  
  export interface StatusOption {
    label: string;
    value: string;
    disabled: boolean;
  }