import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth/auth.service';
import { WatchPartySocketService } from '../../services/watch-party-socket.service';

type PartyDto = {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  authorUsername: string;
  videoPostId: number | null;
  watchers: string[];
};

type CreatePartyRequestDto = {
  name: string;
  description: string;
};

type SetPartyVideoRequestDto = {
  postId: number;
};

type UserPublic = {
  id: number;
  username: string;
  displayName: string;
  profileImageUrl?: string | null;
};

type PostFeed = {
  id: number;
  title: string;
  description?: string | null;
  tags?: string[];
  videoUrl: string;
  thumbnailUrl?: string | null;
  createdAt: string;
  author: UserPublic;
};

type VideoLite = {
  id: number;
  title: string;
  thumbnailUrl?: string | null;
};

@Component({
  selector: 'app-party-create',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './party-create.component.html',
  styleUrls: ['./party-create.component.css'],
})
export class PartyCreateComponent {
  name = '';
  description = '';

  party: PartyDto | null = null;

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

  @ViewChild('dropBox') dropBoxRef!: ElementRef<HTMLDivElement>;

  constructor(
    private http: HttpClient,
    private router: Router,
    public authService: AuthService,
    private ws: WatchPartySocketService
  ) {}

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigateByUrl('/login');
      return;
    }
    this.loadVideos();
  }

  private loadVideos(): void {
    this.loadingVideos = true;
    this.videoError = '';

    this.http.get<PostFeed[]>('/api/posts').subscribe({
      next: (rows) => {
        const mapped = (rows ?? []).map((p) => ({
          id: p.id,
          title: p.title,
          thumbnailUrl: p.thumbnailUrl ?? null,
        }));
        this.videos = mapped;
        this.loadingVideos = false;
      },
      error: () => {
        this.videos = [];
        this.loadingVideos = false;
        this.videoError = 'Failed to load videos';
      },
    });
  }

  get filteredVideos(): VideoLite[] {
    const q = this.search.trim().toLowerCase();
    if (!q) return this.videos;
    return this.videos.filter((v) => v.title.toLowerCase().includes(q));
  }

  get visibleVideos(): VideoLite[] {
    const list = this.filteredVideos;
    return list.slice(this.rowStart, this.rowStart + this.rowSize);
  }

  nextRow(): void {
    const list = this.filteredVideos;
    const next = this.rowStart + this.rowSize;
    if (next >= list.length) return;
    this.rowStart = next;
  }

  prevRow(): void {
    const prev = this.rowStart - this.rowSize;
    this.rowStart = Math.max(0, prev);
  }

  onSearchChange(): void {
    this.rowStart = 0;
  }

  saveParty(): void {
    const n = this.name.trim();
    if (!n) {
      this.saveError = 'Party name is required';
      return;
    }

    this.saving = true;
    this.saveError = '';

    const body: CreatePartyRequestDto = {
      name: n,
      description: this.description?.trim() ?? '',
    };

    this.http.post<PartyDto>('/api/parties', body).subscribe({
      next: (p) => {
        this.party = p;
        this.watchers = p.watchers ?? [];
        this.saving = false;
        this.connectPartySocket(p.id);
      },
      error: (e) => {
        this.saving = false;
        this.saveError = typeof e?.error === 'string' && e.error.trim() ? e.error : 'Failed to create party';
      },
    });
  }

  private connectPartySocket(partyId: string): void {
    this.ws.connect(() => {
      this.sub?.unsubscribe();
      this.sub = this.ws.subscribeParty(partyId, (msg) => {
        if (!msg) return;

        if (msg.type === 'JOIN') {
          const line = `${msg.displayName} has joined!`;
          this.watchers = [...this.watchers, line];
        }

        if (msg.type === 'VIDEO_SELECTED') {
          if (typeof msg.postId === 'number') {
            const v = this.videos.find(x => x.id === msg.postId) ?? null;
            this.selectedVideo = v;
          }
        }
      });
    });
  }

  pickVideo(v: VideoLite): void {
    this.selectedVideo = v;
  }

  dropPick(): void {
    if (!this.party) {
      this.setVideoError = 'Create party first';
      return;
    }
    if (!this.selectedVideo) return;
    this.setPartyVideo(this.selectedVideo.id);
  }

  private setPartyVideo(postId: number): void {
    if (!this.party) return;

    this.settingVideo = true;
    this.setVideoError = '';

    const body: SetPartyVideoRequestDto = { postId };

    this.http.post<PartyDto>(`/api/parties/${this.party.id}/video`, body).subscribe({
      next: (p) => {
        this.party = p;
        this.settingVideo = false;

        this.http.post(`/api/parties/${p.id}/broadcast`, { postId }).subscribe({ next: () => {}, error: () => {} });

        this.router.navigateByUrl(`/party-view/${p.id}`);
      },
      error: (e) => {
        this.settingVideo = false;
        this.setVideoError = typeof e?.error === 'string' && e.error.trim() ? e.error : 'Failed to set video';
      },
    });
  }

  openPartyView(): void {
    if (!this.party) return;
    this.router.navigateByUrl(`/party-view/${this.party.id}`);
  }

  onDragOver(ev: DragEvent): void {
    ev.preventDefault();
    this.dragOver = true;
  }

  onDragLeave(): void {
    this.dragOver = false;
  }

  onDrop(ev: DragEvent): void {
    ev.preventDefault();
    this.dragOver = false;
    this.dropPick();
  }

  thumbSrc(v: VideoLite): string {
    const t = (v.thumbnailUrl ?? '').trim();
    if (t) return t.startsWith('http') ? t : t;
    return 'assets/logo2.png';
  }
}
