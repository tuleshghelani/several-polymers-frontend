export interface EnquiryUpsertRequest {
  id?: number;
  name: string;
  mobile: string;
  mail: string;
  subject: string;
  address: string;
  description: string;
  status: string; // 'A' for Active, 'I' for Inactive
  type: string; // 'Individual' or 'Corporate'
  company?: string;
  city: string;
  state: string;
}

export interface EnquiryListItem {
  id: number;
  name: string;
  mobile: string;
  mail: string;
  subject: string;
  address: string;
  description: string;
  status: string;
  type: string;
  company?: string;
  city: string;
  state: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface EnquirySearchRequest {
  search?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page: number;
  size: number;
  sortBy?: string;
  sortDir?: string;
}

export interface EnquirySearchResponse {
  success: boolean;
  message: string;
  data: {
    content: EnquiryListItem[];
    totalElements: number;
    totalPages: number;
  };
}

export interface EnquiryDetailsResponse {
  success: boolean;
  message: string;
  data: {
    id: number;
    name: string;
    mobile: string;
    mail: string;
    subject: string;
    address: string;
    description: string;
    status: string;
    type: string;
    company?: string;
    city: string;
    state: string;
    clientId?: number;
    createdAt: string;
    updatedAt?: string | null;
    createdById?: number;
    createdByName?: string;
    updatedById?: number;
    updatedByName?: string;
    followupHistory?: FollowupHistoryItem[];
    latestFollowup?: FollowupHistoryItem;
  };
}

export interface FollowupHistoryItem {
  id: number;
  enquiryId: number;
  followupDate: string;
  followupType: string; // 'Call', 'Email', 'Meeting', 'Visit', etc.
  followupNotes: string;
  nextFollowupDate?: string;
  status: string; // 'Completed', 'Pending', 'Cancelled'
  createdById?: number;
  createdByName?: string;
  createdAt: string;
}

export interface EnquiryListRequest {
  page: number;
  size: number;
  sortBy?: string;
  sortDir?: string;
}

export interface EnquiryListResponse {
  success: boolean;
  message: string;
  data: EnquiryListItem[];
}

export interface EnquiryUpsertResponse {
  success: boolean;
  message: string;
  data?: {
    id: number;
  };
}

export interface EnquiryDeleteResponse {
  success: boolean;
  message: string;
}
