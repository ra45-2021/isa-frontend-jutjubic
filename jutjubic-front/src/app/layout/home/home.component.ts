import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../components/auth/auth.service';

interface UserPublic {
  id: number;
  username: string;
  displayName: string;
  profileImageUrl?: string | null;
}

interface PostFeed {
  id: number;
  title: string;
  description?: string | null;
  tags?: string[];
  videoUrl: string;
  thumbnailUrl?: string | null;
  createdAt: string;
  author: UserPublic;
  commentCount?: number;
  likeCount?: number;
  likedByMe?: boolean;
  viewCount?: number;
}

interface CommentViewDto {
  id: number;
  authorUsername: string;
  authorProfileImageUrl?: string | null; 
  createdAt: string;
  text: string;
}

interface CommentPageDto {
  items: CommentViewDto[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  posts: PostFeed[] = [];
  loading = true;
  error = '';

  commentDraft: Record<number, string> = {};
  commentPageIndex: Record<number, number> = {};

  private commentsCache = new Map<string, CommentPageDto>();

  commentsLoading: Record<number, boolean> = {};
  commentsError: Record<number, string> = {};

  private errorTimers: Record<number, any> = {};

  private showCommentError(postId: number, msg: string): void {
  this.commentsError[postId] = msg;

  if (this.errorTimers[postId]) {
    clearTimeout(this.errorTimers[postId]);
  }

  this.errorTimers[postId] = setTimeout(() => {
    if (this.commentsError[postId] === msg) {
      this.commentsError[postId] = '';
    }
    delete this.errorTimers[postId];
  }, 3000);
}


  constructor(
    private http: HttpClient,
    private router: Router,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    this.http.get<PostFeed[]>('/api/posts').subscribe({
      next: data => {
        this.posts = data ?? [];
        this.loading = false;

        for (const p of this.posts) {
          this.commentPageIndex[p.id] = 0;
          this.loadComments(p.id, 0);
        }
      },
      error: () => {
        this.error = 'Failed to load posts';
        this.loading = false;
      }
    });
  }

  hasTags(p: PostFeed): boolean {
    return Array.isArray(p.tags) && p.tags.length > 0;
  }

  actionGuard(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigateByUrl('/login');
      return;
    }
    console.log('User logged in and action permitted but not implemented yet');
  }

  timeLabel(iso: string): string {
    const d = new Date(iso);
    const now = new Date();

    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;

    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;

    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `${diffD}d ago`;

    const diffW = Math.floor(diffD / 7);
    if (diffW < 4) return `${diffW}w ago`;

    return d.toLocaleDateString();
  }

  formatViews(count: number | undefined): string {
    if (!count) return '0';
    if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
    if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
    return count.toString();
  }

  commentTime(iso: string): string {
  return this.timeLabel(iso);
  }

  expandedComments: Record<number, boolean> = {};

  toggleComment(commentId: number): void {
    this.expandedComments[commentId] = !this.expandedComments[commentId];
  }


  commentAvatarSrc(url?: string | null): string {
  const u = (url ?? '').trim();
  return u ? u : 'assets/profile.png';
}


  avatarSrc(u: UserPublic | null | undefined): string {
    const url = (u?.profileImageUrl ?? '').trim();
    return url ? url : 'assets/profile.png';
  }

  imgFallback(e: Event): void {
    const img = e.target as HTMLImageElement;
    if (!img) return;
    img.src = 'assets/profile.png';
  }

  onCommentInputClick(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigateByUrl('/login');
    }
  }

  private cacheKey(postId: number, page: number): string {
    return `${postId}:${page}`;
  }

  getCurrentCommentsPage(postId: number): CommentPageDto | null {
    const page = this.commentPageIndex[postId] ?? 0;
    return this.commentsCache.get(this.cacheKey(postId, page)) ?? null;
  }

  loadComments(postId: number, page: number): void {
    
    const key = this.cacheKey(postId, page);

    if (this.commentsCache.has(key)) {
      this.commentsError[postId] = '';
      return;
    }

    this.commentsLoading[postId] = true;
    this.commentsError[postId] = '';

    this.http.get<CommentPageDto>(`/api/posts/${postId}/comments?page=${page}&size=2`).subscribe({
      next: res => {
      this.commentsCache.set(key, res);
      this.commentsLoading[postId] = false;
    },

      error: () => {
        this.commentsLoading[postId] = false;
        this.commentsError[postId] = 'Failed to load comments';
      }
    });
  }

  prevComments(postId: number): void {
    const curr = this.commentPageIndex[postId] ?? 0;
    if (curr <= 0) return;

    this.commentPageIndex[postId] = curr - 1;
    this.loadComments(postId, this.commentPageIndex[postId]);
  }

  nextComments(postId: number): void {
    const curr = this.commentPageIndex[postId] ?? 0;
    const currPage = this.commentsCache.get(this.cacheKey(postId, curr));
    if (currPage && curr + 1 >= currPage.totalPages) return;

    this.commentPageIndex[postId] = curr + 1;
    this.loadComments(postId, this.commentPageIndex[postId]);
  }

  postComment(postId: number): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigateByUrl('/login');
      return;
    }

    const text = (this.commentDraft[postId] ?? '').trim();
    if (!text) return;

    for (const k of Array.from(this.commentsCache.keys())) {
      if (k.startsWith(`${postId}:`)) this.commentsCache.delete(k);
    }

    this.commentsLoading[postId] = true;
    this.commentsError[postId] = '';

    this.http.post<CommentViewDto>(
      `/api/posts/${postId}/comments`,
      { text }
    )
    .subscribe({
      next: () => {
        this.commentDraft[postId] = '';
        this.commentPageIndex[postId] = 0;
        this.commentsLoading[postId] = false;

        const post = this.posts.find(x => x.id === postId);
        if (post) post.commentCount = (post.commentCount ?? 0) + 1;

        this.loadComments(postId, 0);
      },
      error: (err) => {
        this.commentsLoading[postId] = false;

        const backendMsg =
          typeof err?.error === 'string' && err.error.trim()
            ? err.error
            : null;

        let msg: string;

        if (err?.status === 403) {
          msg = backendMsg ?? 'Your account is inactive. You cannot comment.';
        } else if (err?.status === 429) {
          msg = backendMsg ?? 'Too many comments. Try again later.';
        } else {
          msg = backendMsg ?? 'Failed to post comment';
        }

        this.showCommentError(postId, msg);
      }
    });
  }
  
  toggleLike(p: PostFeed): void {
  if (!this.authService.isLoggedIn()) {
    this.router.navigateByUrl('/login');
    return;
  }

  this.http.post<any>(`/api/posts/${p.id}/like`, {}).subscribe({
    next: (res) => {
      p.likeCount = res.likes;
      p.likedByMe = res.isLiked;
    }
  });
}
}
