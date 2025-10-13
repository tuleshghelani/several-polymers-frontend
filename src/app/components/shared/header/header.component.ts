import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { RoleService } from '../../../services/role.service';
import { Subscription } from 'rxjs';

interface MenuPermissions {
  canViewMaster?: boolean;
  canViewTransaction?: boolean;
  canViewEmployee?: boolean;
  canViewMachine?: boolean;
  canViewEmployeeOrder?: boolean;
  canViewEmployeeWithdraw?: boolean;
  canViewQuotation?: boolean;
  canViewDispatchQuotation?: boolean;
  canViewTransport?: boolean;
  canViewBrand?: boolean;
  canViewCategory?: boolean;
  canViewProduct?: boolean;
  canViewCustomer?: boolean;
  canViewPurchase?: boolean;
  canViewSale?: boolean;
  canCreateSale?: boolean;
  canViewUser?: boolean;
  canViewBatch?: boolean;
  canViewEnquiry?: boolean;
  canViewFollowup?: boolean;
}

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit, OnDestroy {
  isAuthenticated: boolean = false;
  showMasterMenu: boolean = false;
  showTransactionMenu: boolean = false;
  showDispatchQuotationMenu: boolean = false;
  showEmployeeMenu: boolean = false;
  isMobileMenuOpen: boolean = false;
  permissions: MenuPermissions;
  userInfo: any;
  private authSubscription: Subscription;

  constructor(
    private authService: AuthService,
    private roleService: RoleService,
    private router: Router
  ) {
    this.authSubscription = this.authService.authState$.subscribe(
      (isAuthenticated) => {
        this.isAuthenticated = isAuthenticated;
        if (isAuthenticated) {
          this.loadUserPermissions();
        }
      }
    );
    this.permissions = this.getDefaultPermissions();
  }

  ngOnInit(): void {
    this.isAuthenticated = this.authService.isAuthenticated();
    if (this.isAuthenticated) {
      this.loadUserPermissions();
    }
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  private loadUserPermissions(): void {
    this.permissions = this.roleService.getMenuPermissions();
    this.userInfo = this.authService.getUserInfo();
  }

  private getDefaultPermissions(): MenuPermissions {
    return {
      canViewMaster: false,
      canViewTransaction: false,
      canViewEmployee: false,
      canViewMachine: false,
      canViewEmployeeOrder: false,
      canViewEmployeeWithdraw: false,
      canViewQuotation: false,
      canViewDispatchQuotation: false,
      canViewTransport: false,
      canViewBrand: false,
      canViewCategory: false,
      canViewProduct: false,
      canViewCustomer: false,
      canViewPurchase: false,
      canViewSale: false,
      canCreateSale: false,
      canViewUser: false,
      canViewBatch: false,
      canViewEnquiry: false,
      canViewFollowup: false
    };
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown') && !target.closest('.mobile-menu-toggle')) {
      this.showMasterMenu = false;
      this.showTransactionMenu = false;
      this.showDispatchQuotationMenu = false;
      this.showEmployeeMenu = false;
      if (!target.closest('.nav-links')) {
        this.isMobileMenuOpen = false;
      }
    }
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  toggleMasterMenu(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.showMasterMenu = !this.showMasterMenu;
    this.showTransactionMenu = false;
    this.showDispatchQuotationMenu = false;
    this.showEmployeeMenu = false;
  }

  toggleTransactionMenu(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.showTransactionMenu = !this.showTransactionMenu;
    this.showMasterMenu = false;
    this.showDispatchQuotationMenu = false;
    this.showEmployeeMenu = false;
  }

  isMasterActive(): boolean {
    const currentUrl = this.router.url;
    return ['/category', '/product', '/customer', '/employee', '/machine', '/transport-master', '/brand', '/user', '/enquiry'].some(path => 
      currentUrl.includes(path)
    );
  }

  isTransactionActive(): boolean {
    const currentUrl = this.router.url;
    return ['/purchase', '/sale'].some(path => 
      currentUrl.includes(path)
    );
  }

  isDispatchQuotationActive(): boolean {
    const currentUrl = this.router.url;
    return ['/quotation', '/quotation/dispatch-list'].some(path => 
      currentUrl.includes(path)
    );
  }

  hasMasterMenuItems(): boolean {
    return this.permissions.canViewCategory || 
           this.permissions.canViewProduct || 
           this.permissions.canViewCustomer || 
           this.permissions.canViewEmployee || 
           this.permissions.canViewMachine || 
           this.permissions.canViewTransport || 
           this.permissions.canViewBrand ||
           this.permissions.canViewUser ||
           this.permissions.canViewEnquiry || false;
  }

  hasTransactionMenuItems(): boolean {
    return this.permissions.canViewPurchase || this.permissions.canViewSale || this.permissions.canViewDispatchQuotation || false;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']).then(() => {
      window.location.reload();
    });
  }

  getUserDisplayName(): string {
    if (this.userInfo) {
      return `${this.userInfo.firstName} ${this.userInfo.lastName}`;
    }
    return 'User';
  }

  getUserRoles(): string {
    const roles = this.authService.getUserRoles();
    return roles.join(', ');
  }

  toggleDispatchQuotationMenu(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.showDispatchQuotationMenu = !this.showDispatchQuotationMenu;
    this.showTransactionMenu = false;
    this.showMasterMenu = false;
    this.showEmployeeMenu = false;
  }

  toggleEmployeeMenu(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.showEmployeeMenu = !this.showEmployeeMenu;
    this.showMasterMenu = false;
    this.showTransactionMenu = false;
    this.showDispatchQuotationMenu = false;
  }

  isEmployeeActive(): boolean {
    const currentUrl = this.router.url;
    return ['/attendance', '/employee-withdraw', '/employee-order'].some(path => 
      currentUrl.includes(path)
    );
  }

  hasEmployeeMenuItems(): boolean {
    return this.permissions.canViewEmployeeWithdraw || false;
  }
}
