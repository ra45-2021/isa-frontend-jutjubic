import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
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
  scheduledAt?: string | null; 
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
  viewCount?: number;
}

@Component({
  selector: 'app-watch-video',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './watch-video.component.html',
  styleUrls: ['./watch-video.component.css']
})
export class WatchVideoComponent implements OnInit, OnDestroy {
  postId!: number;
  post?: PostFeed;
  loading = true;
  error = '';

  commentDraft = '';
  commentsPage: any = null;
  commentsLoading = false;
  commentsError = '';

  @ViewChild('player') playerRef!: ElementRef<HTMLVideoElement>;
  private viewSent = false;
  private viewTimer: any = null;

  isHovering = false;
  isPlaying = false;
  isMuted = false;
  volume = 1;

  duration = 0;
  current = 0;
  seeking = false;

  private rafId: number | null = null;

  private maybeCountView(): void {
  if (this.viewSent) return;

  const v = this.videoEl();
  if (!v) return;

  if (v.currentTime >= 3) {
    this.viewSent = true;
    console.log('[views] reached 3s, posting /view');

    this.http.post(`/api/posts/${this.postId}/view`, {}).subscribe({
      next: () => {
        console.log('[views] view OK');
        if (this.post) this.post.viewCount = (this.post.viewCount ?? 0) + 1;
      },
      error: (e) => console.error('[views] view FAILED', e),
    });
  }
}

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

  ngOnDestroy(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  private getJwtPayload(): any | null {
    const token = localStorage.getItem('token');
    if (!token) return null;

    const parts = token.split('.');
    if (parts.length !== 3) return null;

    try {
      const payloadJson = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(payloadJson);
    } catch {
      return null;
    }
  }

  private currentUserKey(): string {
    const payload = this.getJwtPayload();
    const stable = payload?.sub || payload?.email || payload?.username || payload?.userId;
    if (stable) return String(stable);

    const token = localStorage.getItem('token');
    return token ? `token:${token}` : 'guest';
  }

  private likeStoreKey(): string {
    return `jutjubic:likes:${this.currentUserKey()}`;
  }

  private getLikedSet(): Set<number> {
    try {
      const raw = localStorage.getItem(this.likeStoreKey());
      const arr = raw ? JSON.parse(raw) : [];
      return new Set<number>(Array.isArray(arr) ? arr : []);
    } catch {
      return new Set<number>();
    }
  }

  private saveLikedSet(set: Set<number>): void {
    localStorage.setItem(this.likeStoreKey(), JSON.stringify([...set]));
  }

  private restoreLikedStateForCurrentPost(): void {
    if (!this.post) return;

    if (!this.authService.isLoggedIn()) {
      this.post.likedByMe = false;
      return;
    }

    const liked = this.getLikedSet();
    this.post.likedByMe = liked.has(this.post.id);
  }

  loadPostDetails(): void {
    this.http.get<PostFeed>(`/api/posts/${this.postId}`).subscribe({
      next: (data) => {
        this.post = data;
        this.loading = false;

        this.restoreLikedStateForCurrentPost();

        queueMicrotask(() => this.applyPlayerVolume());
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
    this.commentsError = '';

    this.http.get(`/api/posts/${this.postId}/comments?page=${page}&size=10`).subscribe({
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
    this.commentsError = '';

    this.http.post(`/api/posts/${this.postId}/comments`, { text }).subscribe({
      next: () => {
        this.commentDraft = '';
        this.loadComments(0);
        if (this.post) this.post.commentCount = (this.post.commentCount ?? 0) + 1;
      },
      error: (err) => {
        this.commentsLoading = false;
        this.commentsError = err?.error || 'Failed to post comment';
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
        if (!this.post) return;

        this.post.likeCount = res.likes;
        this.post.likedByMe = res.isLiked;

        const liked = this.getLikedSet();
        if (this.post.likedByMe) liked.add(this.post.id);
        else liked.delete(this.post.id);
        this.saveLikedSet(liked);
      },
      error: (err) => {
        console.error('Error liking video', err);
      }
    });
  }

  hasTags(p: PostFeed): boolean {
    return Array.isArray(p.tags) && p.tags.length > 0;
  }

  avatarSrc(author: any): string {
    return (author?.profileImageUrl || '').trim() ? author.profileImageUrl : 'assets/profile.png';
  }

  commentAvatarSrc(url: any): string {
    return (url || '').trim() ? url : 'assets/profile.png';
  }

  imgFallback(e: Event): void {
    const img = e.target as HTMLImageElement;
    if (!img) return;
    img.src = 'assets/profile.png';
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
    const x = Number(count ?? 0);
    if (x < 1000) return String(x);
    if (x >= 1000000) return (x / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    return (x / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }

  get shouldShowControls(): boolean {
    return this.isHovering || !this.isPlaying;
  }

  get seekBg(): string {
    const d = this.duration || 1;
    const pct = Math.max(0, Math.min(100, (this.current / d) * 100));
    return `linear-gradient(to right, var(--accent) 0%, var(--accent) ${pct}%, rgba(255,255,255,0.25) ${pct}%, rgba(255,255,255,0.25) 100%)`;
  }

  private videoEl(): HTMLVideoElement | null {
    return this.playerRef?.nativeElement ?? null;
  }

  private tryAutoplay(): void {
    const v = this.videoEl();
    if (!v) return;

    v.muted = false;
    this.isMuted = false;

    const attempt = v.play();
    if (attempt && typeof (attempt as any).catch === 'function') {
      (attempt as any).catch(() => {
        v.muted = true;
        this.isMuted = true;

        const attemptMuted = v.play();
        if (attemptMuted && typeof (attemptMuted as any).catch === 'function') {
          (attemptMuted as any).catch(() => {
            this.isPlaying = false;
          });
        }
      });
    }
  }

  onLoadedMetadata(): void {
      const v = this.videoEl();
      if (!v || !this.post) return;

      this.duration = isFinite(v.duration) ? v.duration : 0;

      if (this.post.scheduledAt) {
          const scheduledUtc = new Date(this.post.scheduledAt.replace(' ', 'T')).getTime();
          const now = Date.now();
          const offsetSeconds = Math.floor((now - scheduledUtc) / 1000);

          const startTime = Math.max(0, Math.min(offsetSeconds, v.duration));
          v.currentTime = startTime;
          this.current = startTime;
      }

      this.isPlaying = !v.paused;
      this.applyPlayerVolume();
      this.tryAutoplay();
      this.tick();
  }


  onTimeUpdate(): void {
    const v = this.videoEl();
    if (!v) return;

    const liveEdge = this.getLiveEdgeSeconds();

    if (v.currentTime > liveEdge) {
      v.currentTime = liveEdge;
    }

    if (!this.seeking) {
      this.current = v.currentTime || 0;
    }

    this.maybeCountView();
  }


  private tick(): void {
    const v = this.videoEl();
    if (!v) return;

    if (!this.seeking) {
      this.current = v.currentTime || 0;
      this.isPlaying = !v.paused;
    }

    this.rafId = requestAnimationFrame(() => this.tick());
  }

  togglePlay(): void {
    const v = this.videoEl();
    if (!v) return;

    if (v.paused) {
      v.play().catch(() => {});
    } else {
      v.pause();
    }

    this.isPlaying = !v.paused;
  }

  onPlay(): void {
    console.log('[views] onPlay fired');
    this.isPlaying = true;

    if (this.viewSent || this.viewTimer) return;

    this.viewTimer = setTimeout(() => {
      this.viewTimer = null;

      const v = this.videoEl();
      if (!v) return;

      if (!v.paused && v.currentTime >= 3 && !this.viewSent) {
        this.viewSent = true;

        this.http.post(`/api/posts/${this.postId}/view`, {}).subscribe({
          next: () => {
            if (this.post) this.post.viewCount = (this.post.viewCount ?? 0) + 1;
          },
          error: (e) => console.error('view increment failed', e),
        });
      }
    }, 3000);
  }

  onPause(): void { this.isPlaying = false; }

  onSeekStart(): void { this.seeking = true; }

  onSeekChange(value: string) {
    const v = this.videoEl();
    if (!v) return;

    const requested = Number(value);
    const liveEdge = this.getLiveEdgeSeconds();

    const allowed = Math.min(requested, liveEdge);

    this.current = allowed;
    v.currentTime = allowed;
  }


  onSeekEnd(): void { this.seeking = false; }

  onSeekInput(value: number | string): void {
    const v = this.videoEl();
    if (!v) return;

    const t = Number(value);
    this.current = t;
    v.currentTime = t;
  }

  toggleMute(): void {
    const v = this.videoEl();
    if (!v) return;

    v.muted = !v.muted;
    this.isMuted = v.muted;
  }

  onVolumeChange(value: string): void {
    const v = this.videoEl();
    if (!v) return;

    const vol = Math.min(1, Math.max(0, Number(value)));
    this.volume = vol;
    v.volume = vol;

    if (vol === 0) {
      v.muted = true;
      this.isMuted = true;
    } else {
      v.muted = false;
      this.isMuted = false;
    }
  }

  private applyPlayerVolume(): void {
    const v = this.videoEl();
    if (!v) return;
    v.volume = this.volume;
    v.muted = this.isMuted;
  }

  formatTime(sec: number): string {
    sec = Math.max(0, Math.floor(sec || 0));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  fullscreen(): void {
    const v = this.videoEl();
    if (!v) return;

    const host = v.parentElement;
    if (!host) return;

    const doc: any = document;
    if (doc.fullscreenElement) {
      doc.exitFullscreen?.();
    } else {
      (host as any).requestFullscreen?.();
    }
  }

  onCommentInputClick(): void {
    if (!this.authService.isLoggedIn()) this.router.navigateByUrl('/login');
  }

  actionGuard(): void {
    if (!this.authService.isLoggedIn()) this.router.navigateByUrl('/login');
  }

  private getLiveEdgeSeconds(): number {
      if (!this.post?.scheduledAt) return this.duration;

      const scheduledUtc = new Date(this.post.scheduledAt.replace(' ', 'T')).getTime();
      const now = Date.now();
      const seconds = Math.floor((now - scheduledUtc) / 1000);
      return Math.max(0, Math.min(seconds, this.duration));
  }
}
