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
        if (!this.currentPostId && p.videoPostId) {
          this.setPostId(p.videoPostId);
        }
      }
    });
  }

  private isSubscribing = false; 

  private connectSocket(id: string): void {
    if (this.wsSub || this.isSubscribing) return;

    this.isSubscribing = true;

    this.wpSocket.connect(() => {
      if (this.wsSub) {
        this.isSubscribing = false;
        return;
      }

      this.wsSub = this.wpSocket.subscribeParty(id, (msg: any) => {
        this.zone.run(() => {
          console.log("Obrađujem socket poruku:", msg.type);
          if (msg.type === 'WATCHERS') this.watchers = msg.watchers;
          if (msg.type === 'PLAY') this.setPostId(Number(msg.postId));
        });
      });
      
      this.isSubscribing = false;
    });
  }

  private setPostId(id: number | null): void {
  if (!id) return;
  const changed = this.currentPostId !== id;
  this.currentPostId = id;

  setTimeout(() => {
      const v = this.playerRef?.nativeElement;
      if (!v) {
        console.warn("Video element nije pronađen u DOM-u!");
        return;
      }
      
      if (changed) {
        v.src = `/api/posts/${id}/video`;
        v.load();
      }
      
      v.muted = true; 
      v.play().catch(err => console.error("Greška pri reprodukciji:", err));
    }, 200);
  }

  videoSrc(): string {
    return this.currentPostId ? `/api/posts/${this.currentPostId}/video` : '';
  }

  back() { this.router.navigateByUrl('/watch-parties'); }
}