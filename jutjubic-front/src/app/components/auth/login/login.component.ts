import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  loginData = {
    emailAdress: '',
    password: ''
  };

  errorMsg: string | null = null;
  private errorTimer: any;

  constructor(private authService: AuthService, private router: Router) {}

  private showError(msg: string) {
    this.errorMsg = msg;

    clearTimeout(this.errorTimer);
    this.errorTimer = setTimeout(() => {
      this.errorMsg = null;
    }, 3000);
  }

  onLogin() {
    this.authService.login(this.loginData).subscribe({
      next: (res) => {
        console.log('Token primljen:', res.token);
        localStorage.setItem('token', res.token);
        this.router.navigate(['/']);
      },
      error: (err) => {
        const message = err.error || 'Invalid email or password.';
        this.showError(message);
      }
    });
  }
}