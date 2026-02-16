import { Injectable } from '@angular/core';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ChatMessage {
  sender: string;
  content: string;
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private client: Client | null = null;
  private messagesSubject = new BehaviorSubject<ChatMessage[]>([]);
  messages$: Observable<ChatMessage[]> = this.messagesSubject.asObservable();

  connect(postId: number): void {
    this.disconnect();
    this.messagesSubject.next([]);

    const token = localStorage.getItem('token');
    if (!token) return;

    this.client = new Client({
      webSocketFactory: () => new SockJS('/ws'),
      connectHeaders: {
        Authorization: `Bearer ${token}`
      },
      reconnectDelay: 5000,
      onConnect: () => {
        this.client!.subscribe(`/topic/chat/${postId}`, (frame: IMessage) => {
          const msg: ChatMessage = JSON.parse(frame.body);
          const current = this.messagesSubject.getValue();
          this.messagesSubject.next([...current, msg]);
        });
      }
    });

    this.client.activate();
  }

  send(postId: number, content: string): void {
    if (!this.client || !this.client.connected) return;

    this.client.publish({
      destination: `/app/chat.send/${postId}`,
      body: JSON.stringify({ content })
    });
  }

  disconnect(): void {
    if (this.client) {
      this.client.deactivate();
      this.client = null;
    }
    this.messagesSubject.next([]);
  }
}
