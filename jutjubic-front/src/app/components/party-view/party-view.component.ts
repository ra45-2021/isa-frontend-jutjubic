import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
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

@Component({
  selector: 'app-party-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './party-view.component.html',
  styleUrls: ['./party-view.component.css'],
})
export class PartyViewComponent implements OnInit, OnDestroy {
  partyId = '';
  party: PartyDto | null = null;

  currentPostId: number | null = null;
  watchers: string[] = [];

  wsSub: any = null;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router,
    private wpSocket: WatchPartySocketService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigateByUrl('/watch-parties');
      return;
    }

    this.partyId = id;

    this.http.post(`/api/parties/${id}/join`, {}).subscribe({
      next: () => this.loadParty(),
      error: () => this.loadParty()
    });

    this.connectSocket(id);
  }

  ngOnDestroy(): void {
    try { this.wsSub?.unsubscribe?.(); } catch {}
  }

  private loadParty(): void {
    this.http.get<PartyDto>(`/api/parties/${this.partyId}`).subscribe({
      next: (p) => {
        this.party = p;
        this.watchers = p.watchers ?? [];
        this.currentPostId = p.videoPostId ?? null;
      },
      error: () => {}
    });
  }

  private connectSocket(id: string): void {
    this.wpSocket.connect(() => {
      this.wsSub = this.wpSocket.subscribeParty(id, (msg: any) => {
        if (!msg?.type) return;

        if (msg.type === 'WATCHERS' && Array.isArray(msg.watchers)) {
          this.watchers = msg.watchers;
        }

        if (msg.type === 'PLAY' && msg.postId) {
          this.currentPostId = Number(msg.postId);
        }
      });
    });
  }

  videoSrc(): string {
    return this.currentPostId ? `/api/posts/${this.currentPostId}/video` : '';
  }

  back(): void {
    this.router.navigateByUrl('/watch-parties');
  }
}
