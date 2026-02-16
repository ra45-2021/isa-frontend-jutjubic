import { Component, ElementRef, OnDestroy, OnInit, ViewChild, NgZone } from '@angular/core';
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

  @ViewChild('player') playerRef!: ElementRef<HTMLVideoElement>;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router,
    private wpSocket: WatchPartySocketService,
    private zone: NgZone
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('partyId');
    if (!id) {
      this.router.navigateByUrl('/watch-parties');
      return;
    }
    this.partyId = id;

    // Uzmi ID iz session storage ako ga je navigacija tamo ostavila
    const pendingId = sessionStorage.getItem('pendingVideoId');
    if (pendingId) {
      this.currentPostId = Number(pendingId);
      sessionStorage.removeItem('pendingVideoId');
    }

    this.connectSocket(id);
    this.loadParty();
  }

  ngOnDestroy(): void {
    if (this.wsSub) this.wsSub.unsubscribe();
  }

  private loadParty(): void {
    this.http.get<PartyDto>(`/api/parties/${this.partyId}`).subscribe({
      next: (p) => {
        this.party = p;
        this.watchers = p.watchers ?? [];
        // Ako već nemamo currentPostId iz session-a, uzmi iz baze
        if (!this.currentPostId && p.videoPostId) {
          this.setPostId(p.videoPostId);
        }
      }
    });
  }

  private connectSocket(id: string): void {
    this.wpSocket.connect(() => {
      this.wsSub = this.wpSocket.subscribeParty(id, (msg: any) => {
        this.zone.run(() => {
          if (msg.type === 'WATCHERS') this.watchers = msg.watchers;
          if (msg.type === 'PLAY') this.setPostId(Number(msg.postId));
        });
      });
    });
  }

  private setPostId(id: number | null): void {
    if (!id) return;
    const changed = this.currentPostId !== id;
    this.currentPostId = id;

    setTimeout(() => {
      const v = this.playerRef?.nativeElement;
      if (!v) return;
      if (changed) v.load();
      v.muted = true;
      v.play().catch(() => console.log('Autoplay blocked'));
    }, 150);
  }

  videoSrc(): string {
    return this.currentPostId ? `http://localhost:8080/api/posts/${this.currentPostId}/video` : '';
  }

  back() { this.router.navigateByUrl('/watch-parties'); }
}