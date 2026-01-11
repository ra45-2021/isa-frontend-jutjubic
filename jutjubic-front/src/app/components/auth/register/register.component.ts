import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})

export class RegisterComponent {
  regData = {
    email: '',
    username: '',
    password: '',
    name: '',
    surname: '',
    adress: '',
    phoneNumber: ''
  };

  toastMsg = '';
  toastType: 'error' | 'success' = 'error';
  showToast = false;
  private toastTimer: any;

  confirmPassword = '';

  constructor(private authService: AuthService, private router: Router) {}

  public popToast(msg: string, type: 'error' | 'success' = 'error') {
    this.toastMsg = msg;
    this.toastType = type;
    this.showToast = true;

    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.showToast = false;
    }, 3000);
  }

  onRegister() {
    if (this.regData.password !== this.confirmPassword) {
      this.popToast("Passwords do not match.", 'error');
      return;
    }

    this.authService.register(this.regData).subscribe({
      next: () => {
        this.popToast(
          "Registration successful! Please check your email for the activation code.",
          'success'
        );

        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 3000);
      },
      error: (err) => {
        if (err.status === 400) {
          const msg =
            typeof err.error === 'string' && err.error.trim()
              ? err.error
              : "Invalid input. Please check your data and try again.";
          this.popToast(msg, 'error');
        } else if (err.status === 403) {
          this.popToast(
            "Access denied. Please verify that all fields are correct.",
            'error'
          );
        } else {
          this.popToast(
            "Registration failed. Please try again.",
            'error'
          );
        }
      }
    });
  }
}
