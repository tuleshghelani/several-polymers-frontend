﻿import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './components/auth/login/login.component';
import { CategoryComponent } from './components/category/category.component';
import { ProductComponent } from './components/product/product.component';
import { AuthGuard } from './guards/auth.guard';
import { PurchaseComponent } from './components/purchase/purchase.component';
import { AddPurchaseComponent } from './components/add-purchase/add-purchase.component';
import { SaleComponent } from './components/sale/sale.component';
import { CustomerComponent } from './components/customer/customer.component';
import { AddCombinedPurchaseSaleComponent } from './components/add-combined-purchase-sale/add-combined-purchase-sale.component';
import { PowderCoatingProcessComponent } from './components/powder-coating/powder-coating-process/powder-coating-process.component';
import { AddPowderCoatingProcessComponent } from './components/powder-coating/add-powder-coating-process/add-powder-coating-process.component';
import { EmployeeListComponent } from './components/employee/employee-list/employee-list.component';
import { EmployeeFormComponent } from './components/employee/employee-form/employee-form.component';
import { EmployeeOrderListComponent } from './components/employee-order/employee-order-list/employee-order-list.component';
import { EmployeeOrderFormComponent } from './components/employee-order/employee-order-form/employee-order-form.component';
import { AddQuotationComponent } from './components/all-quotation/add-quotation/add-quotation.component';
import { DispatchQuotationComponent } from './components/all-quotation/dispatch-quotation/dispatch-quotation.component';
import { QuotationComponent } from './components/all-quotation/quotation/quotation.component';
import { AddSaleComponent } from './components/add-sale/add-sale.component';
import { RoleGuard } from './guards/role.guard';
import { AddTransportComponent } from './components/Transports/add-transport/add-transport.component';
import { TransportMasterListComponent } from './components/Transports/transport-master-list/transport-master-list.component';
import { BrandListComponent } from './components/brand/brand-list/brand-list.component';
import { BrandFormComponent } from './components/brand/brand-form/brand-form.component';
import { UserListComponent } from './components/user/user-list/user-list.component';
import { AddUserComponent } from './components/user/add-user/add-user.component';
import { DispatchQuotationListComponent } from './components/all-quotation/dispatch-quotation-list/dispatch-quotation-list.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { AddBatchComponent } from './components/batch/add-batch/add-batch.component';
import { AttendanceListComponent } from './components/attendance/attendance-list/attendance-list.component';
import { AddWithdrawComponent } from './components/employee-withdraw/add-withdraw/add-withdraw.component';
import { MachineListComponent } from './components/machine/machine-list/machine-list.component';
import { AddMachineComponent } from './components/machine/add-machine/add-machine.component';
import { BatchListComponent } from './components/batch/batch-list/batch-list.component';
import { WithdrawListComponent } from './components/employee-withdraw/withdraw-list/withdraw-list.component';
import { CreateAttendanceComponent } from './components/attendance/create-attendance/create-attendance.component';
import { AttendanceDetailComponent } from './components/attendance/attendance-detail/attendance-detail.component';
import { AllAttendanceComponent } from './components/attendance/all-attendance/all-attendance.component';
import { AddEnquiryComponent } from './components/enquiry/add-enquiry/add-enquiry.component';
import { EnquiryListComponent } from './components/enquiry/enquiry-list/enquiry-list.component';
import { FollowupListComponent } from './components/followup/followup-list/followup-list.component';
import { PaymentHistoryListComponent } from './components/payment-history/payment-history-list/payment-history-list.component';
import { AddPaymentHistoryComponent } from './components/payment-history/add-payment-history/add-payment-history.component';

const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  
  { 
    path: 'dashboard', 
    component: DashboardComponent, 
    canActivate: [AuthGuard, RoleGuard],
  },
  
  // Master Menu Routes
  { 
    path: 'category', 
    component: CategoryComponent, 
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ADMIN', 'SALES_AND_MARKETING', 'DISPATCH'] }
  },
  { 
    path: 'product', 
    component: ProductComponent, 
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ADMIN', 'SALES_AND_MARKETING', 'DISPATCH'] }
  },
  { 
    path: 'customer', 
    component: CustomerComponent, 
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ADMIN', 'SALES_AND_MARKETING', 'DISPATCH'] }
  },
  {
    path: 'machine',
    component: MachineListComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ADMIN'] }
  },
  {
    path: 'machine/create',
    component: AddMachineComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ADMIN'] }
  },
  {
    path: 'machine/edit/:id',
    component: AddMachineComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ADMIN'] }
  },
  {
    path: 'batch',
    component: BatchListComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ADMIN', 'PRODUCT_MANAGER', 'HR'] }
  },
  {
    path: 'employee',
    component: EmployeeListComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ADMIN', 'HR'] }
  },
  {
    path: 'employee/create',
    component: EmployeeFormComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ADMIN', 'HR'] }
  },  
  {
    path: 'employee/edit/:id',
    component: EmployeeFormComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ADMIN', 'HR'] }
  },
  {
    path: 'transport-master',
    component: TransportMasterListComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ADMIN', 'SALES_AND_MARKETING', 'DISPATCH'] }
  },
  {
    path: 'transport-master/create',
    component: AddTransportComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ADMIN', 'SALES_AND_MARKETING', 'DISPATCH'] }
  },
  {
    path: 'transport-master/edit',
    component: AddTransportComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ADMIN', 'SALES_AND_MARKETING', 'DISPATCH'] }
  },
  {
    path: 'brand',
    component: BrandListComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ADMIN', 'SALES_AND_MARKETING', 'DISPATCH'] }
  },
  {
    path: 'brand/create',
    component: BrandFormComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ADMIN', 'SALES_AND_MARKETING', 'DISPATCH'] }
  },
  {
    path: 'brand/edit',
    component: BrandFormComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ADMIN', 'SALES_AND_MARKETING', 'DISPATCH'] }
  },
  {
    path: 'user',
    component: UserListComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ADMIN'] }
  },
  {
    path: 'user/create',
    component: AddUserComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ADMIN'] }
  },
  {
    path: 'user/edit/:id',
    component: AddUserComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ADMIN'] }
  },
  
  // Transaction Menu Routes
  { 
    path: 'purchase', 
    component: PurchaseComponent, 
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ADMIN', 'SALES_AND_MARKETING', 'DISPATCH'] }
  },
  {
    path: 'purchase/create',
    component: AddPurchaseComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ADMIN', 'SALES_AND_MARKETING', 'DISPATCH'] }
  },

  // Batch Routes
  {
    path: 'batch/add',
    component: AddBatchComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ADMIN', 'PRODUCT_MANAGER'] }
  },
  {
    path: 'batch/create',
    component: AddBatchComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ADMIN', 'PRODUCT_MANAGER'] }
  },
  {
    path: 'batch/edit/:encryptedId',
    component: AddBatchComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ADMIN', 'PRODUCT_MANAGER'] }
  },
  {
    path: 'sale',
    component: SaleComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ADMIN', 'SALES_AND_MARKETING', 'DISPATCH'] }
  },
  {
    path: 'sale/create',
    component: AddSaleComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ADMIN'] } // Only ADMIN can create sales
  },
  
  // Other Routes
  {
    path: 'quotation',
    component: QuotationComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ADMIN', 'SALES_AND_MARKETING', 'DISPATCH'] }
  },
  {
    path: 'quotation/create',
    component: AddQuotationComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ADMIN', 'SALES_AND_MARKETING', 'DISPATCH'] }
  },
  {
    path: 'quotation/dispatch',
    component: DispatchQuotationComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ADMIN', 'DISPATCH'] }
  },
  {
    path: 'quotation/dispatch-list',
    component: DispatchQuotationListComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ADMIN', 'DISPATCH'] }
  },
  {
    path: 'employee-order',
    component: EmployeeOrderListComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ADMIN', 'HR', 'OPERATOR', 'DISPATCH'] }
  },
  {
    path: 'employee-order/create',
    component: EmployeeOrderFormComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ADMIN', 'HR'] }
  },  
  {
    path: 'employee-order/edit/:id',
    component: EmployeeOrderFormComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ADMIN', 'HR'] }
  },
  
  {
    path: 'attendance',
    component: AttendanceListComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ADMIN', 'PRODUCT_MANAGER', 'HR'] }
  },
  {
    path: 'attendance/all',
    component: AllAttendanceComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ADMIN', 'PRODUCT_MANAGER', 'HR'] }
  },
  {
    path: 'attendance/create',
    component: CreateAttendanceComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ADMIN', 'PRODUCT_MANAGER', 'HR'] }
  },
  {
    path: 'attendance/details',
    component: AttendanceDetailComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ADMIN', 'PRODUCT_MANAGER', 'HR'] }
  },

  // Employee Withdraw
  {
    path: 'employee-withdraw',
    component: WithdrawListComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ADMIN', 'HR'] }
  },
  {
    path: 'employee-withdraw/create',
    component: AddWithdrawComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ADMIN', 'HR'] }
  },
  {
    path: 'employee-withdraw/edit/:id',
    component: AddWithdrawComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ADMIN', 'HR'] }
  },

  // Enquiry Routes
  {
    path: 'enquiry',
    component: EnquiryListComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ADMIN', 'SALES_AND_MARKETING', 'DISPATCH'] }
  },
  {
    path: 'enquiry/add',
    component: AddEnquiryComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ADMIN', 'SALES_AND_MARKETING', 'DISPATCH'] }
  },
  {
    path: 'enquiry/create',
    component: AddEnquiryComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ADMIN', 'SALES_AND_MARKETING', 'DISPATCH'] }
  },
  {
    path: 'enquiry/edit/:encryptedId',
    component: AddEnquiryComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ADMIN', 'SALES_AND_MARKETING', 'DISPATCH'] }
  },
  
  // Follow-up Routes
  {
    path: 'followup',
    component: FollowupListComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ADMIN', 'SALES_AND_MARKETING', 'DISPATCH'] }
  },

  // Payment Routes
  {
    path: 'payment-history',
    component: PaymentHistoryListComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ADMIN', 'SALES_AND_MARKETING'] }
  },
  {
    path: 'payment-history/add',
    component: AddPaymentHistoryComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ADMIN', 'SALES_AND_MARKETING'] }
  },
  {
    path: 'payment-history/edit/:encryptedId',
    component: AddPaymentHistoryComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ADMIN', 'SALES_AND_MARKETING'] }
  },
  // Legacy routes (keeping for backward compatibility)
  {
    path: 'combined-purchase-sale',
    component: AddCombinedPurchaseSaleComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ADMIN'] }
  },
  {
    path: 'powder-coating-process',
    component: PowderCoatingProcessComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ADMIN'] }
  },  
  {
    path: 'powder-coating-process/create',
    component: AddPowderCoatingProcessComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ADMIN'] }
  },
  {
    path: 'powder-coating-process/edit/:id',
    component: AddPowderCoatingProcessComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ADMIN'] },
    title: 'Edit Powder Coating Process'
  },
  
  // Catch-all redirect
  {
    path: '**',
    redirectTo: '/login',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule]
})
export class AppRoutingModule { }