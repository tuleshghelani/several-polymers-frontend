export interface FollowUp {
  id?: number;
  followUpStatus: string; // 'S' for Schedule, 'C' for Completed
  nextActionDate: string; // ISO date string with time
  description?: string;
  enquiryId: number;
  enquiryName?: string;
  clientId?: number;
  clientName?: string;
  createdAt?: string;
  updatedAt?: string;
  createdById?: number;
  createdByName?: string;
  updatedById?: number;
  updatedByName?: string;
}

export interface FollowUpRequest {
  id?: number;
  enquiryId: number;
  nextActionDate: string; // ISO date string with time
  description?: string;
}

export interface FollowUpResponse {
  status: string;
  message: string;
  data: FollowUp;
}

export interface FollowUpListData {
  followUps: FollowUp[];
  latestFollowUp: FollowUp;
}

export interface FollowUpListResponse {
  status: string;
  message: string;
  data: FollowUpListData;
}

// Helper function to get the display status
export function getFollowUpStatusDisplay(status: string): string {
  return status === 'S' ? 'Schedule' : status === 'C' ? 'Completed' : status;
}