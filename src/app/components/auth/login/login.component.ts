import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { SnackbarService } from '../../../shared/services/snackbar.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  loginForm: FormGroup;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackbar: SnackbarService
  ) {
    this.loginForm = this.fb.group({
      phoneNumber: ['', [Validators.required]],
      password: ['', Validators.required]
    });
  }

  onSubmit() {
    
    if (this.loginForm.valid) {
      this.isLoading = true;
      console.log('Calling auth service with:', this.loginForm.value);
      
      this.authService.login(this.loginForm.value).subscribe({
        next: (response) => {
          localStorage.setItem('token', response.accessToken);
          localStorage.setItem('user', JSON.stringify(response.user));
          this.snackbar.success('Login successful');
          this.router.navigate(['/category']);
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Login error:', error);
          this.snackbar.error(error?.error?.message || 'Login failed');
          this.isLoading = false;
        }
      });
    } else {
      console.log('Form is invalid, showing warning');
      this.snackbar.warning('Please fill in all required fields correctly');
    }
  }

  private getFormErrors(): any {
    const errors: any = {};
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      if (control && control.errors) {
        errors[key] = control.errors;
      }
    });
    return errors;
  }
}