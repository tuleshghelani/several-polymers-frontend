import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, forwardRef, ElementRef, HostListener, OnInit, OnDestroy, ChangeDetectorRef, ViewChild } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-searchable-select',
  templateUrl: './searchable-select.component.html',
  styleUrls: ['./searchable-select.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SearchableSelectComponent),
      multi: true
    }
  ],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ]
})
export class SearchableSelectComponent implements ControlValueAccessor, OnInit, OnDestroy {
  @Input() options: any[] = [];
  @Input() labelKey: string = 'name';
  @Input() valueKey: string = 'id';
  @Input() placeholder: string = 'Select an option';
  @Input() defaultOption: { label: string; value: any } | null = null;
  @Input() searchPlaceholder: string = 'Search...';
  @Input() multiple = false;
  @Input() allowClear = true;
  @Input() focusWidthPx?: number; // Optional width applied on focus (in pixels)
  @Input() maxHeight: string = '200px'; // Maximum height for dropdown
  @Input() virtualScroll = false; // Enable virtual scrolling for large datasets
  @Input() searchDebounceMs = 300; // Debounce search input
  @Input() enableSearch = true; // Enable/disable search functionality
  @Input() searchMinLength = 0; // Minimum characters to start searching
  @Input() showSearchIcon = true; // Show search icon in input

  @ViewChild('searchInput', { static: false }) searchInput!: ElementRef<HTMLInputElement>;
  @ViewChild('dropdown', { static: false }) dropdown!: ElementRef<HTMLDivElement>;

  searchText: string = '';
  isOpen: boolean = false;
  selectedValue: any = '';
  selectedValues: any[] = [];
  filteredOptions: any[] = [];
  highlightedIndex: number = -1;
  isSearching: boolean = false;
  
  onChange: any = () => {};
  onTouch: any = () => {};

  isMobile = this.detectMobile();
  isTablet = window.innerWidth > 768 && window.innerWidth <= 1024;
  isSmallMobile = window.innerWidth <= 480;
  private currentScrollPosition = 0;
  isKeyboardScrolling = false;
  private searchTimeout: any;
  private resizeObserver?: ResizeObserver;
  private intersectionObserver?: IntersectionObserver;
  private originalBodyStyles: any = null;
  private originalHtmlStyles: any = null;

  ngOnInit() {
    this.filteredOptions = this.options;
  }

  constructor(
    private elementRef: ElementRef,
    private cdr: ChangeDetectorRef
  ) {
    this.setupResizeObserver();
  }

  private detectMobile(): boolean {
    // More comprehensive mobile detection
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    const isMobileSize = window.innerWidth <= 768;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    return isMobileUA || (isMobileSize && isTouchDevice);
  }

  writeValue(value: any): void {
    if (this.multiple) {
      this.selectedValues = value || [];
    } else {
      this.selectedValue = value;
      if (value) {
        const selectedOption = this.options.find(opt => opt[this.valueKey] === value);
        if (selectedOption) {
          this.searchText = selectedOption[this.labelKey];
        }
      }
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouch = fn;
  }

  toggleDropdown(event?: MouseEvent | TouchEvent) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    // Prevent double-click issues
    if (this.isOpen && event?.type === 'click') {
      return;
    }
    
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      // Store scroll position before opening
      this.currentScrollPosition = window.pageYOffset || document.documentElement.scrollTop;
      
      this.searchText = '';
      this.filterOptions();
      this.lockBodyScroll();
      this.focusSearchInput();
      this.setupIntersectionObserver();
    } else {
      this.unlockBodyScroll();
      this.cleanupIntersectionObserver();
    }
  }

  onFocus() {
    if (!this.isOpen) {
      // Store scroll position before opening
      this.currentScrollPosition = window.pageYOffset || document.documentElement.scrollTop;
      
      this.isOpen = true;
      this.filterOptions();
      this.highlightedIndex = -1;
      this.lockBodyScroll();
      this.setupIntersectionObserver();
    }
  }

  onInputClick(event: MouseEvent) {
    // Only open dropdown if not already open to prevent double-click issues
    if (!this.isOpen) {
      this.toggleDropdown(event);
    }
  }

  // Method to prevent any unwanted scrolling
  private preventScrollJump(): void {
    if (this.isMobile) {
      // Store current position with multiple fallbacks
      const currentScroll = window.pageYOffset || 
                           document.documentElement.scrollTop || 
                           document.body.scrollTop || 
                           0;
      
      // Use multiple requestAnimationFrame calls for better reliability
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // Check if scroll position changed and restore if needed
          const newScroll = window.pageYOffset || 
                           document.documentElement.scrollTop || 
                           document.body.scrollTop || 
                           0;
          
          if (Math.abs(newScroll - currentScroll) > 5) {
            // Try multiple methods to restore position
            window.scrollTo(0, currentScroll);
            document.documentElement.scrollTop = currentScroll;
            document.body.scrollTop = currentScroll;
          }
        });
      });
    }
  }

  onBlur(event: FocusEvent) {
    const target = event.relatedTarget as HTMLElement;
    if (target?.classList.contains('scroll-btn') || 
        target?.classList.contains('option') ||
        target?.closest('.select-dropdown') ||
        this.isKeyboardScrolling) {
      event.preventDefault();
      return;
    }

    // Use longer timeout for mobile to prevent premature closing
    const timeout = this.isMobile ? 200 : 100;
    setTimeout(() => {
      this.isOpen = false;
      this.highlightedIndex = -1;
      
      if (!this.multiple) {
        const selected = this.options.find(opt => opt[this.valueKey] === this.selectedValue);
        this.searchText = selected ? selected[this.labelKey] : '';
      }
      this.unlockBodyScroll();
      this.cleanupIntersectionObserver();
    }, timeout);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!this.elementRef.nativeElement.contains(target)) {
      this.closeDropdown();
    }
  }

  @HostListener('document:touchstart', ['$event'])
  onDocumentTouchStart(event: TouchEvent): void {
    const target = event.target as HTMLElement;
    if (!this.elementRef.nativeElement.contains(target)) {
      this.closeDropdown();
    }
  }

  onSearch(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    
    // Clear existing timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    
    // Show searching state
    this.isSearching = true;
    
    // Debounce search for better performance
    this.searchTimeout = setTimeout(() => {
      this.searchText = value;
      this.filterOptions();
      this.isOpen = true;
      this.isSearching = false;
      this.cdr.detectChanges();
    }, this.searchDebounceMs);
  }

  filterOptions() {
    if (!this.enableSearch || this.searchText.length < this.searchMinLength) {
      this.filteredOptions = this.options;
    } else {
      this.filteredOptions = this.options.filter(option =>
        option[this.labelKey].toLowerCase().includes(this.searchText.toLowerCase())
      );
    }
    this.highlightedIndex = this.filteredOptions.length > 0 ? 0 : -1;
  }

  selectOption(option: any, event?: MouseEvent | TouchEvent) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    if (this.multiple) {
      const value = option[this.valueKey];
      const index = this.selectedValues.indexOf(value);
      
      if (index === -1) {
        this.selectedValues = [...this.selectedValues, value];
      } else {
        this.selectedValues = this.selectedValues.filter(v => v !== value);
      }
      
      this.onChange(this.selectedValues);
    } else {
      this.selectedValue = option[this.valueKey];
      this.searchText = option[this.labelKey];
      this.onChange(this.selectedValue);
      this.closeDropdown();
    }
    this.onTouch();
  }

  isSelected(option: any): boolean {
    const value = option[this.valueKey];
    return this.multiple 
      ? this.selectedValues.includes(value)
      : this.selectedValue === value;
  }

  hasSelection(): boolean {
    return this.multiple ? this.selectedValues.length > 0 : !!this.selectedValue;
  }

  clearSelection(event?: MouseEvent | TouchEvent): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    if (this.multiple) {
      this.selectedValues = [];
      this.onChange(this.selectedValues);
    } else {
      this.selectedValue = '';
      this.searchText = '';
      this.onChange(this.selectedValue);
    }
    this.onTouch();
  }

  getSelectedLabel(): string {
    if (this.multiple) {
      return this.selectedValues.length 
        ? `${this.selectedValues.length} selected`
        : this.placeholder;
    }
    
    if (!this.selectedValue && this.defaultOption) {
      return this.defaultOption.label;
    }
    const selected = this.options.find(opt => opt[this.valueKey] === this.selectedValue);
    return selected ? selected[this.labelKey] : this.placeholder;
  }

  handleKeydown(event: KeyboardEvent): void {
    if (!this.isOpen) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        this.isOpen = true;
        this.highlightedIndex = 0;
        event.preventDefault();
      }
      return;
    }

    const container = document.querySelector('.options-container');
    if (!container) return;

    const scrollStep = 160; // Height of 4 options (40px each)

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        this.isKeyboardScrolling = true;
        event.preventDefault();
        event.stopPropagation();
        
        this.highlightedIndex = Math.min(
          this.highlightedIndex + (event.key === 'ArrowDown' ? 4 : -4), 
          this.filteredOptions.length - 1
        );
        
        container.scrollBy({
          top: event.key === 'ArrowDown' ? scrollStep : -scrollStep,
          behavior: 'smooth'
        });
        
        setTimeout(() => {
          this.isKeyboardScrolling = false;
        }, 100);
        break;

      case 'Enter':
        if (this.highlightedIndex >= 0 && this.filteredOptions[this.highlightedIndex]) {
          this.selectOption(this.filteredOptions[this.highlightedIndex]);
          event.preventDefault();
        }
        break;

      case 'Escape':
        this.isOpen = false;
        this.highlightedIndex = -1;
        event.preventDefault();
        break;
    }
  }

  scrollOptions(direction: 'up' | 'down', event?: MouseEvent | TouchEvent): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const container = document.querySelector('.options-container');
    if (!container) return;

    const scrollAmount = 160; // Height of 4 options (40px each)
    const currentScroll = container.scrollTop;
    
    if (direction === 'up') {
      container.scrollTo({
        top: currentScroll - scrollAmount,
        behavior: 'smooth'
      });
      this.highlightedIndex = Math.max(this.highlightedIndex - 4, 0);
    } else {
      container.scrollTo({
        top: currentScroll + scrollAmount,
        behavior: 'smooth'
      });
      this.highlightedIndex = Math.min(
        this.highlightedIndex + 4, 
        this.filteredOptions.length - 1
      );
    }
  }

  ngOnChanges(changes: any): void {
    if (changes.options && !changes.options.firstChange) {
      if (!this.multiple && this.selectedValue) {
        const selectedOption = this.options.find(opt => opt[this.valueKey] === this.selectedValue);
        if (selectedOption) {
          this.searchText = selectedOption[this.labelKey];
        }
      }
    }
  }

  @HostListener('window:resize')
  onResize() {
    this.isMobile = window.innerWidth <= 768;
    this.isTablet = window.innerWidth > 768 && window.innerWidth <= 1024;
    this.isSmallMobile = window.innerWidth <= 480;
  }

  onDropdownPointerDown() {
    // Prevent input blur from closing dropdown prematurely on mobile
  }

  onOptionTouchStart(event: TouchEvent) {
    // Prevent default touch behavior that might interfere with selection
    event.preventDefault();
  }

  ngOnDestroy() {
    this.cleanup();
  }

  private closeDropdown(): void {
    this.isOpen = false;
    this.highlightedIndex = -1;
    if (!this.multiple) {
      const selected = this.options.find(opt => opt[this.valueKey] === this.selectedValue);
      this.searchText = selected ? selected[this.labelKey] : '';
    }
    this.unlockBodyScroll();
    this.cleanupIntersectionObserver();
  }

  private focusSearchInput(): void {
    if (this.searchInput && this.isMobile) {
      // Small delay to ensure dropdown is rendered and scroll is locked
      setTimeout(() => {
        // Prevent any scrolling when focusing
        const currentScroll = window.pageYOffset || 
                             document.documentElement.scrollTop || 
                             document.body.scrollTop || 
                             0;
        
        this.searchInput.nativeElement.focus();
        
        // Use requestAnimationFrame to ensure focus is complete
        requestAnimationFrame(() => {
          // Check if scroll position changed and restore if needed
          const newScroll = window.pageYOffset || 
                           document.documentElement.scrollTop || 
                           document.body.scrollTop || 
                           0;
          
          if (Math.abs(newScroll - currentScroll) > 10) {
            // Try multiple methods to restore position
            window.scrollTo(0, currentScroll);
            document.documentElement.scrollTop = currentScroll;
            document.body.scrollTop = currentScroll;
          }
        });
      }, 150); // Increased delay for better reliability
    }
  }

  private setupResizeObserver(): void {
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.cdr.detectChanges();
      });
    }
  }

  private setupIntersectionObserver(): void {
    if (this.dropdown && typeof IntersectionObserver !== 'undefined') {
      this.intersectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting && this.isOpen) {
            this.closeDropdown();
          }
        });
      });
      this.intersectionObserver.observe(this.dropdown.nativeElement);
    }
  }

  private cleanupIntersectionObserver(): void {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = undefined;
    }
  }

  private cleanup(): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    this.cleanupIntersectionObserver();
    this.removeScrollPreventionListeners();
    this.unlockBodyScroll();
  }

  private lockBodyScroll(): void {
    if (this.isMobile) {
      // Store current scroll position with multiple fallbacks
      this.currentScrollPosition = window.pageYOffset || 
                                   document.documentElement.scrollTop || 
                                   document.body.scrollTop || 
                                   0;
      
      // Add class to body and html for additional scroll prevention
      document.body.classList.add('searchable-select-open');
      document.documentElement.classList.add('searchable-select-open');
      
      // Apply comprehensive styles to prevent scrolling
      const body = document.body;
      const html = document.documentElement;
      
      // Store original styles for restoration
      this.originalBodyStyles = {
        position: body.style.position,
        top: body.style.top,
        width: body.style.width,
        overflow: body.style.overflow,
        height: body.style.height,
        left: body.style.left,
        right: body.style.right
      };
      
      this.originalHtmlStyles = {
        overflow: html.style.overflow,
        height: html.style.height
      };
      
      // Apply fixed positioning to body
      body.style.position = 'fixed';
      body.style.top = `-${this.currentScrollPosition}px`;
      body.style.width = '100%';
      body.style.height = '100%';
      body.style.overflow = 'hidden';
      body.style.left = '0';
      body.style.right = '0';
      
      // Also apply to html element for better compatibility
      html.style.overflow = 'hidden';
      html.style.height = '100%';
      
      // Add touch event listeners to prevent scrolling
      this.addScrollPreventionListeners();
      
      // Prevent any scroll jump after applying styles
      this.preventScrollJump();
    }
  }

  private unlockBodyScroll(): void {
    if (this.isMobile) {
      // Remove class from body and html
      document.body.classList.remove('searchable-select-open');
      document.documentElement.classList.remove('searchable-select-open');
      
      // Remove touch event listeners
      this.removeScrollPreventionListeners();
      
      // Restore original styles
      const body = document.body;
      const html = document.documentElement;
      
      if (this.originalBodyStyles) {
        body.style.position = this.originalBodyStyles.position;
        body.style.top = this.originalBodyStyles.top;
        body.style.width = this.originalBodyStyles.width;
        body.style.overflow = this.originalBodyStyles.overflow;
        body.style.height = this.originalBodyStyles.height;
        body.style.left = this.originalBodyStyles.left;
        body.style.right = this.originalBodyStyles.right;
      }
      
      if (this.originalHtmlStyles) {
        html.style.overflow = this.originalHtmlStyles.overflow;
        html.style.height = this.originalHtmlStyles.height;
      }
      
      // Restore scroll position with multiple methods for better compatibility
      setTimeout(() => {
        window.scrollTo(0, this.currentScrollPosition);
        document.documentElement.scrollTop = this.currentScrollPosition;
        document.body.scrollTop = this.currentScrollPosition;
      }, 0);
    }
  }

  private addScrollPreventionListeners(): void {
    if (this.isMobile) {
      // Prevent touch scrolling
      document.addEventListener('touchmove', this.preventTouchScroll, { passive: false });
      document.addEventListener('touchstart', this.preventTouchScroll, { passive: false });
      document.addEventListener('touchend', this.preventTouchScroll, { passive: false });
      
      // Prevent wheel scrolling
      document.addEventListener('wheel', this.preventWheelScroll, { passive: false });
      
      // Prevent keyboard scrolling
      document.addEventListener('keydown', this.preventKeyboardScroll, { passive: false });
    }
  }

  private removeScrollPreventionListeners(): void {
    if (this.isMobile) {
      document.removeEventListener('touchmove', this.preventTouchScroll);
      document.removeEventListener('touchstart', this.preventTouchScroll);
      document.removeEventListener('touchend', this.preventTouchScroll);
      document.removeEventListener('wheel', this.preventWheelScroll);
      document.removeEventListener('keydown', this.preventKeyboardScroll);
    }
  }

  private preventTouchScroll = (e: TouchEvent): void => {
    // Allow scrolling within the dropdown
    const target = e.target as HTMLElement;
    if (target?.closest('.select-dropdown') || target?.closest('.options-container')) {
      return;
    }
    e.preventDefault();
  };

  private preventWheelScroll = (e: WheelEvent): void => {
    // Allow scrolling within the dropdown
    const target = e.target as HTMLElement;
    if (target?.closest('.select-dropdown') || target?.closest('.options-container')) {
      return;
    }
    e.preventDefault();
  };

  private preventKeyboardScroll = (e: KeyboardEvent): void => {
    // Allow arrow keys for dropdown navigation
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Enter' || e.key === 'Escape') {
      return;
    }
    // Prevent other keyboard scrolling
    if (e.key === 'PageUp' || e.key === 'PageDown' || e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
    }
  };
} 