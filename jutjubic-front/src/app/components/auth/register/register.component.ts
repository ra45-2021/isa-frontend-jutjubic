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

  confirmPassword = '';

  constructor(private authService: AuthService, private router: Router) {}

  onRegister() {
  if (this.regData.password !== this.confirmPassword) {
    alert('Lozinke se ne podudaraju!');
    return;
  }

  this.authService.register(this.regData).subscribe({
    next: (res) => {
      alert('Registracija uspešna! Poslali smo vam mejl sa aktivacionim kodom. Proverite sanduče pre prijave.');
      this.router.navigate(['/login']);
    },
    error: (err) => {
      if (err.status === 400 && err.error) {
        alert(err.error);
      } else if (err.status === 403) {
        alert("Pristup odbijen. Proverite da li su svi podaci ispravni.");
      } else {
        alert('Došlo je do greške pri registraciji. Pokušajte ponovo.');
      }
    }
  });
}
}