import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';

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
}

interface CommentViewDto {
  id: number;
  authorUsername: string;
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

  // TODO: replace later with real auth
  isLoggedIn = false;

  openCommentsPostId: number | null = null;

  commentDraft: Record<number, string> = {};

  commentPageIndex: Record<number, number> = {};

  private commentsCache = new Map<string, CommentPageDto>();

  commentsLoading: Record<number, boolean> = {};
  commentsError: Record<number, string> = {};

  // TEMP: until real auth is implemented
  currentUsername = 'ana.zaric';

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.http.get<PostFeed[]>('/api/posts').subscribe({
      next: data => {
        this.posts = data ?? [];
        this.loading = false;
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
    if (!this.isLoggedIn) {
      this.router.navigateByUrl('/login');
      return;
    }
    console.log('Action allowed');
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

  commentTime(iso: string): string {
    return new Date(iso).toLocaleString();
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


  toggleComments(postId: number): void {
    if (this.openCommentsPostId === postId) {
      this.openCommentsPostId = null;
      return;
    }

    this.openCommentsPostId = postId;

    if (this.commentPageIndex[postId] == null) {
      this.commentPageIndex[postId] = 0;
    }

    this.loadComments(postId, this.commentPageIndex[postId]);
  }

  onCommentInputClick(): void {
    if (!this.isLoggedIn) {
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

    this.http.get<CommentPageDto>(`/api/posts/${postId}/comments?page=${page}&size=6`).subscribe({
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
    if (!this.isLoggedIn) {
      this.router.navigateByUrl('/login');
      return;
    }

    const text = (this.commentDraft[postId] ?? '').trim();
    if (!text) return;

    for (const k of Array.from(this.commentsCache.keys())) {
      if (k.startsWith(`${postId}:`)) {
        this.commentsCache.delete(k);
      }
    }

    this.commentsLoading[postId] = true;
    this.commentsError[postId] = '';

    this.http.post<CommentViewDto>(
      `/api/posts/${postId}/comments?authorUsername=${encodeURIComponent(this.currentUsername)}`,
      { text }
    ).subscribe({
      next: () => {
        this.commentDraft[postId] = '';
        this.commentPageIndex[postId] = 0;
        this.commentsLoading[postId] = false;
        this.loadComments(postId, 0);
      },
      error: () => {
        this.commentsLoading[postId] = false;
        this.commentsError[postId] = 'Failed to post comment';
      }
    });
  }
}
