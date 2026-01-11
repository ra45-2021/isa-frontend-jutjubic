import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';

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

interface PostView {
  id: number;
  title: string;
  description?: string | null;
  tags?: string[];
  videoUrl: string;
  thumbnailUrl?: string | null;
  createdAt: string;
  author: {
    id: number;
    username: string;
    name: string;
    surname: string;
    profileImageUrl?: string | null;
  };
  commentCount?: number;
  likeCount?: number;
  likedByMe?: boolean;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  user?: ProfileUser;
  loading = true;
  error = '';

  posts: PostView[] = [];
  postsLoading = true;
  postsError = '';

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

        this.loadPosts(u.username);
      },
      error: () => {
        this.error = 'User not found';
        this.loading = false;
        this.postsLoading = false;
      }
    });
  }

  private loadPosts(username: string) {
    this.postsLoading = true;
    this.postsError = '';

    this.http.get<PostView[]>(`/api/posts/by-user/${encodeURIComponent(username)}`).subscribe({
      next: ps => {
        this.posts = ps ?? [];
        this.postsLoading = false;
      },
      error: () => {
        this.postsError = 'Could not load videos.';
        this.postsLoading = false;
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

  thumbFallback(e: Event) {
    const img = e.target as HTMLImageElement;
    img.src = 'assets/progile.png';
  }
}
