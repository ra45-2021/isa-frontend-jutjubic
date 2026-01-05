import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';

interface ProfileUser {
  id: number;
  username: string;
  emailAdress: string;
  name: string;
  surname: string;
  adress?: string | null;
  bio?: string | null;
  role: string;
  profileImageUrl?: string | null;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  user?: ProfileUser;
  loading = true;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    const username = this.route.snapshot.paramMap.get('username');
    if (!username) {
      this.error = 'Missing username';
      this.loading = false;
      return;
    }

    this.http.get<ProfileUser>(`/api/users/${encodeURIComponent(username)}`).subscribe({
      next: u => {
        this.user = u;
        this.loading = false;
      },
      error: () => {
        this.error = 'User not found';
        this.loading = false;
      }
    });
  }

  avatarSrc(): string {
    return this.user?.profileImageUrl?.trim() ? this.user!.profileImageUrl! : 'assets/profile.png';
  }

  imgFallback(e: Event) {
    const img = e.target as HTMLImageElement;
    img.src = 'assets/profile.png';
  }
}
