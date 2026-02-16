import { Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ChatMessage, ChatService } from '../../services/chat.service';

@Component({
  selector: 'app-live-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './live-chat.component.html',
  styleUrls: ['./live-chat.component.css']
})
export class LiveChatComponent implements OnInit, OnDestroy {
  @Input() postId!: number;
  @ViewChild('scrollContainer') private scrollRef!: ElementRef<HTMLDivElement>;

  messages: ChatMessage[] = [];
  draft = '';
  private sub!: Subscription;

  constructor(private chatService: ChatService) {}

  ngOnInit(): void {
    this.chatService.connect(this.postId);
    this.sub = this.chatService.messages$.subscribe(msgs => {
      this.messages = msgs;
      this.scrollToBottom();
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.chatService.disconnect();
  }

  send(): void {
    const text = this.draft.trim();
    if (!text) return;
    this.chatService.send(this.postId, text);
    this.draft = '';
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  formatTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const el = this.scrollRef?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }
}
