import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { FormsModule } from '@angular/forms';

interface PostFeed {
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
    profileImageUrl?: string | null;
  };
  commentCount?: number;
  likeCount?: number;
  likedByMe?: boolean;
}

@Component({
  selector: 'app-watch-video',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './watch-video.component.html',
  styleUrls: ['./watch-video.component.css']
})
export class WatchVideoComponent implements OnInit {
  postId!: number;
  post?: PostFeed;
  loading = true;
  error = '';

  commentDraft = '';
  commentsPage: any = null;
  commentsLoading = false;
  commentsError = '';

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.postId = +idParam;
      this.loadPostDetails();
      this.loadComments(0);
    }
  }

  loadPostDetails(): void {
    this.http.get<PostFeed>(`/api/posts/${this.postId}`).subscribe({
      next: (data) => {
        this.post = data;
        this.loading = false;
      },
      error: () => {
        this.error = 'Video not found.';
        this.loading = false;
      }
    });
  }

  getVideoUrl(): string {
    return `/api/posts/${this.postId}/video`;
  }

  loadComments(page: number): void {
    this.commentsLoading = true;
    this.http.get(`/api/posts/${this.postId}/comments?page=${page}&size=5`).subscribe({
      next: (res) => {
        this.commentsPage = res;
        this.commentsLoading = false;
      },
      error: () => {
        this.commentsError = 'Failed to load comments';
        this.commentsLoading = false;
      }
    });
  }

  postComment(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigateByUrl('/login');
      return;
    }

    const text = this.commentDraft.trim();
    if (!text) return;

    this.commentsLoading = true;
    this.http.post(`/api/posts/${this.postId}/comments`, { text }).subscribe({
      next: () => {
        this.commentDraft = '';
        this.loadComments(0);
        if (this.post) {
          this.post.commentCount = (this.post.commentCount ?? 0) + 1;
        }
      },
      error: (err) => {
        this.commentsLoading = false;
        this.commentsError = err.error || 'Failed to post comment';
      }
    });
  }

  toggleLike(): void {
  if (!this.authService.isLoggedIn()) {
    this.router.navigateByUrl('/login');
    return;
  }

  this.http.post<any>(`/api/posts/${this.postId}/like`, {}).subscribe({
    next: (res) => {
      if (this.post) {
        this.post.likeCount = res.likes;
        this.post.likedByMe = res.isLiked;
      }
    },
    error: (err) => {
      console.error('Error liking video', err);
    }
  });
}

  // Pomoćne metode preuzete iz HomeComponent
  hasTags(p: PostFeed): boolean {
    return Array.isArray(p.tags) && p.tags.length > 0;
  }

  avatarSrc(author: any): string {
    return author?.profileImageUrl || 'assets/profile.png';
  }

  commentAvatarSrc(url: any): string {
    return url || 'assets/profile.png';
  }

  imgFallback(e: Event): void {
    const img = e.target as HTMLImageElement;
    img.src = 'assets/profile.png';
  }

  timeLabel(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString();
  }

  onCommentInputClick(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigateByUrl('/login');
    }
  }

  actionGuard(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigateByUrl('/login');
    }
  }
}