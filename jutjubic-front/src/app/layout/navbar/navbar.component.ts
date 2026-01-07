import { Component, Inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule, DOCUMENT } from '@angular/common';
import { AuthService } from '../../components/auth/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent {
  sidebarOpen = true; 

  constructor(
    @Inject(DOCUMENT) private document: Document,
    public authService: AuthService
  ) {
    this.syncBodyClass();
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
    this.syncBodyClass();
  }

  private syncBodyClass() {
    this.document.body.classList.toggle('sidebar-open', this.sidebarOpen);
  }
}