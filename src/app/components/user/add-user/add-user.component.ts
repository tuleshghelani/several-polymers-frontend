import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { UserService } from '../../../services/user.service';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';
import { SnackbarService } from '../../../shared/services/snackbar.service';
import { User, UserCreateRequest, UserUpdateRequest } from '../../../models/user.model';

@Component({
  selector: 'app-add-user',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LoaderComponent,
    RouterLink
  ],
  templateUrl: './add-user.component.html',
  styleUrls: ['./add-user.component.scss']
})
export class AddUserComponent implements OnInit {
  userForm!: FormGroup;
  isLoading = false;
  isEditMode = false;
  userId?: number;
  availableRoles: string[] = [];
  statusOptions: { value: string; label: string }[] = [];

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private router: Router,
    private route: ActivatedRoute,
    private snackbar: SnackbarService
  ) {
    this.loadOptions();
  }

  ngOnInit(): void {
    this.userId = Number(this.route.snapshot.paramMap.get('id'));
    this.isEditMode = !!this.userId;
    
    this.initializeForm();
    
    if (this.isEditMode) {
      this.loadUser();
    }
  }

  private initializeForm(): void {
    this.userForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', []],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^\+?[1-9]\d{1,14}$/)]],
      email: ['', [Validators.email]],
      password: ['', [Validators.required, Validators.minLength(4)]],
      confirmPassword: ['', [Validators.required]],
      status: ['A', Validators.required],
      roles: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  private loadOptions(): void {
    this.availableRoles = this.userService.getAvailableRoles();
    this.statusOptions = this.userService.getStatusOptions();
  }

  private passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    } else if (confirmPassword && confirmPassword.hasError('passwordMismatch')) {
      confirmPassword.setErrors(null);
    }
    
    return null;
  }

  onSubmit(): void {
    console.log('Form submitted!');
    console.log('Form valid:', this.userForm.valid);
    console.log('Form value:', this.userForm.value);
    console.log('Form errors:', this.getFormErrors());
    
    if (this.userForm.valid) {
      this.isLoading = true;
      const formData = { ...this.userForm.value };
      
      delete formData.confirmPassword;
      
      if (this.isEditMode) {
        const updateData: UserUpdateRequest = {
          id: this.userId!,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phoneNumber: formData.phoneNumber,
          email: formData.email,
          status: formData.status,
          roles: [formData.roles]
        };
        
        this.userService.updateUser(updateData).subscribe({
          next: (response) => {
            if (response.success) {
              this.snackbar.success('User updated successfully');
              this.router.navigate(['/user']);
            }
            this.isLoading = false;
          },
          error: (error) => {
            this.snackbar.error(error.message || 'Failed to update user');
            this.isLoading = false;
          }
        });
      } else {
        const createData: UserCreateRequest = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          phoneNumber: formData.phoneNumber,
          email: formData.email,
          password: formData.password,
          status: formData.status,
          roles: [formData.roles],
          clientId: 1
        };
        
        this.userService.createUser(createData).subscribe({
          next: (response) => {
            if (response.success) {
              this.snackbar.success('User created successfully');
              this.router.navigate(['/user']);
            }
            this.isLoading = false;
          },
          error: (error) => {
            this.snackbar.error(error.message || 'Failed to create user');
            this.isLoading = false;
          }
        });
      }
    } else {
      console.log('Form is invalid, marking all fields as touched');
      Object.keys(this.userForm.controls).forEach(key => {
        const control = this.userForm.get(key);
        if (control?.invalid) {
          control.markAsTouched();
          console.log(`Field ${key} is invalid:`, control.errors);
        }
      });
      this.snackbar.error('Please fill in all required fields correctly');
    }
  }

  private loadUser(): void {
    if (!this.userId) return;
    
    this.userService.getUserById(this.userId).subscribe({
      next: (response) => {
        if (response.success) {
          const user = response.data;
          this.userForm.patchValue({
            firstName: user.firstName,
            lastName: user.lastName,
            phoneNumber: user.phoneNumber,
            email: user.email,
            status: user.status,
            roles: Array.isArray(user.roles) && user.roles.length > 0 ? user.roles[0] : ''
          });
        }
      },
      error: () => {
        this.snackbar.error('Failed to load user details');
        this.router.navigate(['/user']);
      }
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.userForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.userForm.get(fieldName);
    if (field && field.errors) {
      if (field.errors['required']) {
        return `${this.getFieldLabel(fieldName)} is required`;
      }
      if (field.errors['minlength']) {
        return `${this.getFieldLabel(fieldName)} must be at least ${field.errors['minlength'].requiredLength} characters`;
      }
      if (field.errors['email']) {
        return 'Please enter a valid email address';
      }
      if (field.errors['pattern']) {
        return 'Please enter a valid phone number';
      }
      if (field.errors['passwordMismatch']) {
        return 'Passwords do not match';
      }
    }
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      firstName: 'First Name',
      lastName: 'Last Name',
      phoneNumber: 'Phone Number',
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      status: 'Status',
      roles: 'Roles'
    };
    return labels[fieldName] || fieldName;
  }

  onRoleChange(role: string, event: any): void {
    // Get the roles control from the form
    const rolesControl = this.userForm.get('roles');
    
    if (event.target.checked) {
      // Set the selected role as a single string value
      rolesControl?.setValue(role);
      rolesControl?.markAsTouched();
      rolesControl?.markAsDirty();
    }
  }

  selectRole(role: string): void {
    // Get the roles control from the form
    const rolesControl = this.userForm.get('roles');
    
    // Set the selected role as a single string value
    rolesControl?.setValue(role);
    rolesControl?.markAsTouched();
    rolesControl?.markAsDirty();
  }

  isRoleSelected(role: string): boolean {
    const selectedRole = this.userForm.get('roles')?.value;
    // Check if the current role matches the selected role
    return selectedRole === role;
  }

  private getFormErrors(): any {
    const errors: any = {};
    Object.keys(this.userForm.controls).forEach(key => {
      const control = this.userForm.get(key);
      if (control && control.errors) {
        errors[key] = control.errors;
      }
    });
    return errors;
  }

  // Debug method to check form status
  checkFormStatus(): void {
    console.log('Form Status Check:');
    console.log('Form exists:', !!this.userForm);
    console.log('Form valid:', this.userForm?.valid);
    console.log('Form value:', this.userForm?.value);
    console.log('Available roles:', this.availableRoles);
    console.log('Is edit mode:', this.isEditMode);
  }
}
