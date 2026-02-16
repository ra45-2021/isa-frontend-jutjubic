import { Component, ElementRef, ViewChild, DestroyRef, inject, OnInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth/auth.service';
import { WatchPartySocketService } from '../../services/watch-party-socket.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

type PartyDto = {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  authorUsername: string;
  videoPostId: number | null;
  watchers: string[];
  canManage?: boolean;
};

type CreatePartyRequestDto = { name: string; description: string; };
type SetPartyVideoRequestDto = { postId: number; };
type UserPublic = { id: number; username: string; displayName: string; profileImageUrl?: string | null; };
type PostFeed = { id: number; title: string; videoUrl: string; thumbnailUrl?: string | null; author: UserPublic; };
type VideoLite = { id: number; title: string; thumbnailUrl?: string | null; };

@Component({
  selector: 'app-party-create',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './party-create.component.html',
  styleUrls: ['./party-create.component.css'],
})
export class PartyCreateComponent implements OnInit {
  name = '';
  description = '';
  party: PartyDto | null = null;
  canManage = false;
  saving = false;
  saveError = '';
  videos: VideoLite[] = [];
  loadingVideos = true;
  videoError = '';
  search = '';
  rowStart = 0;
  rowSize = 4;
  selectedVideo: VideoLite | null = null;
  settingVideo = false;
  setVideoError = '';
  dragOver = false;
  watchers: string[] = [];

  private sub: { unsubscribe: () => void } | null = null;
  private errorTimers: Partial<Record<'saveError' | 'videoError' | 'setVideoError', any>> = {};
  private destroyRef = inject(DestroyRef);

  @ViewChild('dropBox') dropBoxRef!: ElementRef<HTMLDivElement>;

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    public authService: AuthService,
    private ws: WatchPartySocketService,
    private zone: NgZone
  ) {}

  ngOnInit(): void {
    const partyId = this.route.snapshot.paramMap.get('partyId');
    if (partyId) {
      this.http.post<PartyDto>(`/api/parties/${partyId}/join`, {}).subscribe({
        next: (p) => { this.party = p; this.loadParty(partyId); },
        error: () => this.loadParty(partyId)
      });
    } else {
      if (!this.authService.isLoggedIn()) {
        this.router.navigateByUrl('/login');
        return;
      }
      this.loadVideos();
    }
  }

  private loadVideos(done?: () => void): void {
    this.loadingVideos = true;
    this.http.get<PostFeed[]>('/api/posts').pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (rows) => {
        this.videos = (rows ?? []).map(p => ({ id: p.id, title: p.title, thumbnailUrl: p.thumbnailUrl ?? null }));
        this.loadingVideos = false;
        done?.();
        if (this.party?.videoPostId != null) {
          this.selectedVideo = this.videos.find(v => v.id === this.party!.videoPostId) ?? null;
        }
      },
      error: () => { this.loadingVideos = false; done?.(); }
    });
  }

  private loadParty(partyId: string): void {
    this.http.get<PartyDto>(`/api/parties/${partyId}`).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (p) => {
        this.party = p;
        this.name = p.name;
        this.description = p.description;
        this.watchers = p.watchers;
        this.canManage = !!p.canManage;
        this.loadVideos(() => {
          if (p.videoPostId) this.selectedVideo = this.videos.find(v => v.id === p.videoPostId) ?? null;
        });
        this.connectPartySocket(p.id);
      }
    });
  }

  get filteredVideos(): VideoLite[] {
    const q = this.search.trim().toLowerCase();
    return q ? this.videos.filter(v => v.title.toLowerCase().includes(q)) : this.videos;
  }

  get visibleVideos(): VideoLite[] {
    return this.filteredVideos.slice(this.rowStart, this.rowStart + this.rowSize);
  }

  onSearchChange() { this.rowStart = 0; }
  nextRow() { if (this.rowStart + this.rowSize < this.filteredVideos.length) this.rowStart += this.rowSize; }
  prevRow() { this.rowStart = Math.max(0, this.rowStart - this.rowSize); }

  saveParty(): void {
    if (!this.name.trim()) return;
    this.saving = true;
    this.http.post<PartyDto>('/api/parties', { name: this.name, description: this.description })
      .subscribe({
        next: (p) => {
          this.party = p;
          this.canManage = true;
          this.saving = false;
          this.connectPartySocket(p.id);
        },
        error: () => this.saving = false
      });
  }

  private connectPartySocket(partyId: string): void {
    this.ws.connect(() => {
      if (this.sub) this.sub.unsubscribe();
      this.sub = this.ws.subscribeParty(partyId, (msg) => {
        if (!msg) return;
        this.zone.run(() => {
          if (msg.type === 'PLAY') {
            sessionStorage.setItem('pendingVideoId', msg.postId.toString());
            this.router.navigateByUrl(`/party-view/${partyId}`);
          }
          if (msg.type === 'JOIN' || msg.type === 'WATCHERS') {
            this.watchers = msg.watchers ?? this.watchers;
          }
        });
      });
    });
  }

  pickVideo(v: VideoLite) { if (this.canManage) this.selectedVideo = v; }

  dropPick() {
    if (this.canManage && this.party && this.selectedVideo) {
      this.setPartyVideo(this.selectedVideo.id);
    }
  }

  private setPartyVideo(postId: number): void {
    this.settingVideo = true;
    this.http.post<PartyDto>(`/api/parties/${this.party!.id}/start`, { postId })
      .subscribe({
        next: (p) => {
          sessionStorage.setItem('pendingVideoId', postId.toString());
          this.router.navigateByUrl(`/party-view/${p.id}`);
        },
        error: () => this.settingVideo = false
      });
  }

  onDragOver(ev: DragEvent) { if (this.canManage) { ev.preventDefault(); this.dragOver = true; } }
  onDragLeave() { this.dragOver = false; }
  onDrop(ev: DragEvent) { if (this.canManage) { ev.preventDefault(); this.dragOver = false; this.dropPick(); } }
  thumbSrc(v: VideoLite) { return v.thumbnailUrl || 'assets/logo2.png'; }
}