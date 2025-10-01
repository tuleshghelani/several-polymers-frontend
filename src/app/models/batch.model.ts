export interface BatchMixerItemRequest {
  batchId: number | null;
  productId: number;
  quantity: number;
}

export interface BatchProductionItemRequest {
  batchId: number | null;
  productId: number;
  quantity: number;
  numberOfRoll: number;
}

export interface BatchUpsertRequest {
  id: number | null;
  date: string; // ISO date (YYYY-MM-DD)
  shift: string; // e.g., 'A' | 'B' | 'C'
  resignBagUse: number;
  resignBagOpeningStock: number;
  cpwBagUse: number;
  cpwBagOpeningStock: number;
  machineId: number;
  mixer: BatchMixerItemRequest[];
  production: BatchProductionItemRequest[];
}

export interface BatchFullDetailsResponse {
  success: boolean;
  message: string;
  data: {
    id: number;
    date: string;
    shift: string;
    name: string;
    resignBagUse: number;
    resignBagOpeningStock: number;
    cpwBagUse: number;
    cpwBagOpeningStock: number;
    machineId: number;
    machineName: string;
    clientId?: number;
    clientName?: string;
    createdBy?: string;
    createdAt?: string;
    updatedAt?: string | null;
    mixerItems: Array<{
      id: number;
      productId: number;
      productName: string;
      productDescription: string;
      productMeasurement: string;
      productWeight: number;
      productPurchaseAmount: number;
      productSaleAmount: number;
      productRemainingQuantity: number;
      productTaxPercentage: number;
      productStatus: string;
      quantity: number;
      categoryName: string;
    }>;
    productionItems: Array<{
      id: number;
      productId: number;
      productName: string;
      productDescription: string;
      productMeasurement: string;
      productWeight: number;
      productPurchaseAmount: number;
      productSaleAmount: number;
      productRemainingQuantity: number;
      productTaxPercentage: number;
      productStatus: string;
      quantity: number;
      numberOfRoll: number;
      categoryName: string;
    }>;
  };
}

export interface MachineListResponse {
  success: boolean;
  message: string;
  data: Array<{ id: number; name: string; status: string }>;
}


export interface BatchSearchRequest {
  date?: string; // YYYY-MM-DD
  shift?: string; // 'A' | 'B' | 'C'
  machineId?: number;
  page: number;
  size: number;
  sortBy?: string;
  sortDir?: string;
}

export interface BatchListItem {
  id: number;
  date: string;
  shift: string;
  name: string;
  resignBagUse: number;
  resignBagOpeningStock: number;
  cpwBagUse: number;
  cpwBagOpeningStock: number;
  machineId: number;
}

export interface BatchSearchResponse {
  success: boolean;
  message: string;
  data: {
    content: BatchListItem[];
    totalRecords: number;
    pageSize: number;
  };
}