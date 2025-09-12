import { Injectable } from '@angular/core';
import { AuthService, UserRole } from './auth.service';

interface MenuPermissions {
  canViewMaster: boolean;
  canViewTransaction: boolean;
  canViewEmployee: boolean;
  canViewEmployeeOrder: boolean;
  canViewQuotation: boolean;
  canViewTransport: boolean;
  canViewBrand: boolean;
  canViewCategory: boolean;
  canViewProduct: boolean;
  canViewCustomer: boolean;
  canViewPurchase: boolean;
  canViewSale: boolean;
  canCreateSale: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  constructor(private authService: AuthService) {}

  getMenuPermissions(): MenuPermissions {
    const userRoles = this.authService.getUserRoles();
    
    // Default permissions (all false)
    let permissions: MenuPermissions = {
      canViewMaster: false,
      canViewTransaction: false,
      canViewEmployee: false,
      canViewEmployeeOrder: false,
      canViewQuotation: false,
      canViewTransport: false,
      canViewBrand: false,
      canViewCategory: false,
      canViewProduct: false,
      canViewCustomer: false,
      canViewPurchase: false,
      canViewSale: false,
      canCreateSale: false
    };

    // ADMIN - can access everything
    if (userRoles.includes(UserRole.ADMIN)) {
      permissions = {
        canViewMaster: true,
        canViewTransaction: true,
        canViewEmployee: true,
        canViewEmployeeOrder: true,
        canViewQuotation: true,
        canViewTransport: true,
        canViewBrand: true,
        canViewCategory: true,
        canViewProduct: true,
        canViewCustomer: true,
        canViewPurchase: true,
        canViewSale: true,
        canCreateSale: true
      };
    }
    // SALES_AND_MARKETING - can access Master menu, Transaction menu, and Quotation
    else if (userRoles.includes(UserRole.SALES_AND_MARKETING)) {
      permissions = {
        canViewMaster: true,
        canViewTransaction: true,
        canViewEmployee: false,
        canViewEmployeeOrder: false,
        canViewQuotation: true,
        canViewTransport: true,
        canViewBrand: true,
        canViewCategory: true,
        canViewProduct: true,
        canViewCustomer: true,
        canViewPurchase: true,
        canViewSale: true,
        canCreateSale: false
      };
    }
    // HR - can access employee menu and employee-order
    else if (userRoles.includes(UserRole.HR)) {
      permissions = {
        canViewMaster: true, // Only for employee submenu
        canViewTransaction: false,
        canViewEmployee: true,
        canViewEmployeeOrder: true,
        canViewQuotation: false,
        canViewTransport: false,
        canViewBrand: false,
        canViewCategory: false,
        canViewProduct: false,
        canViewCustomer: false,
        canViewPurchase: false,
        canViewSale: false,
        canCreateSale: false
      };
    }
    // DISPATCH - can access category, products, customer, brand, purchase, sale, quotation
    else if (userRoles.includes(UserRole.DISPATCH)) {
      permissions = {
        canViewMaster: true,
        canViewTransaction: true,
        canViewEmployee: false,
        canViewEmployeeOrder: false,
        canViewQuotation: true,
        canViewTransport: true,
        canViewBrand: true,
        canViewCategory: true,
        canViewProduct: true,
        canViewCustomer: true,
        canViewPurchase: true,
        canViewSale: true,
        canCreateSale: false
      };
    }
    // OPERATOR and REPORTER - no access for now
    else if (userRoles.includes(UserRole.OPERATOR) || userRoles.includes(UserRole.REPORTER)) {
      // Keep default permissions (all false)
    }

    return permissions;
  }

  canAccessRoute(route: string): boolean {
    const permissions = this.getMenuPermissions();
    
    switch (route) {
      case '/category':
        return permissions.canViewCategory;
      case '/product':
        return permissions.canViewProduct;
      case '/customer':
        return permissions.canViewCustomer;
      case '/employee':
        return permissions.canViewEmployee;
      case '/employee-order':
        return permissions.canViewEmployeeOrder;
      case '/transport-master':
        return permissions.canViewTransport;
      case '/brand':
        return permissions.canViewBrand;
      case '/purchase':
        return permissions.canViewPurchase;
      case '/sale':
        return permissions.canViewSale;
      case '/quotation':
        return permissions.canViewQuotation;
      default:
        return false;
    }
  }
} 