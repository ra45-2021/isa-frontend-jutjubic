import { Component, Inject, HostListener, DestroyRef, inject } from '@angular/core';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { CommonModule, DOCUMENT } from '@angular/common';
import { AuthService } from '../../components/auth/auth.service';
import { HttpClient } from '@angular/common/http';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

type MeDto = {
  id: number;
  username: string;
  profileImageUrl?: string | null;
};

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent {
  sidebarOpen = true;
  profileMenuOpen = false;

  me: MeDto | null = null;

  private destroyRef = inject(DestroyRef);

  constructor(
    @Inject(DOCUMENT) private document: Document,
    public authService: AuthService,
    private router: Router,
    private http: HttpClient
  ) {
    this.syncBodyClass();
    this.loadMeIfLoggedIn();

    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.loadMeIfLoggedIn());
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
    this.syncBodyClass();
  }

  private syncBodyClass() {
    this.document.body.classList.toggle('sidebar-open', this.sidebarOpen);
  }

  private loadMeIfLoggedIn(): void {
    if (!this.authService.isLoggedIn()) {
      this.me = null;
      return;
    }

    this.http.get<MeDto>('/api/users/me').subscribe({
      next: u => (this.me = u),
      error: () => (this.me = null)
    });
  }

  profileImgSrc(): string {
    const url = (this.me?.profileImageUrl ?? '').trim();
    return url ? url : 'assets/profile.png';
  }

  imgFallback(e: Event): void {
    const img = e.target as HTMLImageElement;
    if (!img) return;
    img.src = 'assets/profile.png';
  }

  toggleProfileMenu(ev: MouseEvent): void {
    ev.stopPropagation();
    this.profileMenuOpen = !this.profileMenuOpen;
  }

  goMyProfile(): void {
    this.profileMenuOpen = false;
    this.router.navigateByUrl('/profile');
  }

  logout(): void {
    this.profileMenuOpen = false;
    this.authService.logout();
    this.me = null;
    this.router.navigateByUrl('/login');
  }

  @HostListener('document:click')
  closeOnOutsideClick(): void {
    this.profileMenuOpen = false;
  }
}
