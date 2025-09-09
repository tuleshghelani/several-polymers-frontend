import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './components/auth/login/login.component';
import { CategoryComponent } from './components/category/category.component';
import { ProductComponent } from './components/product/product.component';
import { AuthGuard } from './guards/auth.guard';
import { PurchaseComponent } from './components/purchase/purchase.component';
import { AddPurchaseComponent } from './components/add-purchase/add-purchase.component';
import { SaleComponent } from './components/sale/sale.component';
import { ProfitComponent } from './components/profit/profit.component';
import { CustomerComponent } from './components/customer/customer.component';
import { AddCombinedPurchaseSaleComponent } from './components/add-combined-purchase-sale/add-combined-purchase-sale.component';
import { PowderCoatingProcessComponent } from './components/powder-coating/powder-coating-process/powder-coating-process.component';
import { AddPowderCoatingProcessComponent } from './components/powder-coating/add-powder-coating-process/add-powder-coating-process.component';
import { EmployeeListComponent } from './components/employee/employee-list/employee-list.component';
import { EmployeeFormComponent } from './components/employee/employee-form/employee-form.component';
import { EmployeeOrderListComponent } from './components/employee-order/employee-order-list/employee-order-list.component';
import { EmployeeOrderFormComponent } from './components/employee-order/employee-order-form/employee-order-form.component';
import { DailyProfitComponent } from './components/all-profits/daily-profit/daily-profit.component';
import { AddQuotationComponent } from './components/all-quotation/add-quotation/add-quotation.component';
import { QuotationComponent } from './components/all-quotation/quotation/quotation.component';
import { AddSaleComponent } from './components/add-sale/add-sale.component';
import { RoleGuard } from './guards/role.guard';
import { AddTransportComponent } from './components/Transports/add-transport/add-transport.component';
import { TransportMasterListComponent } from './components/Transports/transport-master-list/transport-master-list.component';
const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { 
    path: 'category', 
    component: CategoryComponent, 
    canActivate: [AuthGuard] 
  },
  { 
    path: 'product', 
    component: ProductComponent, 
    canActivate: [AuthGuard] 
  },
  { 
    path: 'purchase', 
    component: PurchaseComponent, 
    canActivate: [AuthGuard] 
  },
  {
    path: 'purchase/create',
    component: AddPurchaseComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'sale',
    component: SaleComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'sale/create',
    component: AddSaleComponent,
    canActivate: [AuthGuard, RoleGuard],
    // data: { roles: ['ADMIN'] }
  },
  {
    path: 'profit',
    component: ProfitComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'customer',
    component: CustomerComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'combined-purchase-sale',
    component: AddCombinedPurchaseSaleComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'powder-coating-process',
    component: PowderCoatingProcessComponent,
    canActivate: [AuthGuard]
  },  
  {
    path: 'powder-coating-process/create',
    component: AddPowderCoatingProcessComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'powder-coating-process/edit/:id',
    component: AddPowderCoatingProcessComponent,
    title: 'Edit Powder Coating Process'
  },
  {
    path: 'transport-master/create',
    component: AddTransportComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'transport-master',
    component: TransportMasterListComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'quotation',
    component: QuotationComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'quotation/create',
    component: AddQuotationComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'transport-master/edit',
    component: AddTransportComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'employee',
    component: EmployeeListComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'employee/create',
    component: EmployeeFormComponent,
    canActivate: [AuthGuard]
  },  
  {
    path: 'employee/edit/:id',
    component: EmployeeFormComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'employee-order',
    component: EmployeeOrderListComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'employee-order/create',
    component: EmployeeOrderFormComponent,
    canActivate: [AuthGuard]
  },  
  {
    path: 'employee-order/edit/:id',
    component: EmployeeOrderFormComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'daily-profit',
    component: DailyProfitComponent,
    canActivate: [AuthGuard]
  },  
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