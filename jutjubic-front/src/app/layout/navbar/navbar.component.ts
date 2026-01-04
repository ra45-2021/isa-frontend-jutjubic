import { Component, Inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule, DOCUMENT } from '@angular/common';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent {
  sidebarOpen = true; 
  isLoggedIn = false;   // TODO: replace later with real auth

  constructor(@Inject(DOCUMENT) private document: Document) {
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
