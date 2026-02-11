import { Component, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../components/auth/auth.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

type PartyDto = {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  authorUsername: string;
  videoPostId?: number | null;
};

@Component({
  selector: 'app-watch-parties',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './watch-parties.component.html',
  styleUrls: ['./watch-parties.component.css'],
})
export class WatchPartiesComponent {
  parties: PartyDto[] = [];
  loading = false;
  error = '';

  private destroyRef = inject(DestroyRef);

  constructor(
    public authService: AuthService,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadParties();
  }

  loadParties(): void {
    this.loading = true;
    this.http.get<PartyDto[]>('/api/parties')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => { this.parties = data ?? []; this.loading = false; },
        error: () => { this.error = 'Failed to load parties'; this.loading = false; }
      });
  }

  joinParty(id: string): void {
    this.http.post(`/api/parties/${id}/join`, {}).subscribe({
      next: () => this.router.navigateByUrl(`/party-view/${id}`),
      error: () => this.router.navigateByUrl(`/party-view/${id}`)
    });
  }

  openParty(id: string): void {
    this.router.navigateByUrl(`/party-create/${id}`);
  }


}
