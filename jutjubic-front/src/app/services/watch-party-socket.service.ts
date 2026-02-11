import { Injectable } from '@angular/core';
import { Client } from '@stomp/stompjs';

@Injectable({ providedIn: 'root' })
export class WatchPartySocketService {
  private client: Client | null = null;

  connect(onConnected: () => void): void {
    if (this.client?.active) {
      onConnected();
      return;
    }

    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    const url = `${protocol}://${location.host}/ws`;

    this.client = new Client({
      brokerURL: url,
      reconnectDelay: 2000,
    });

    this.client.onConnect = () => onConnected();
    this.client.activate();
  }

  subscribeParty(partyId: string, onMsg: (msg: any) => void) {
    if (!this.client) return { unsubscribe() {} };

    return this.client.subscribe(`/topic/party/${partyId}`, (frame) => {
      try {
        onMsg(JSON.parse(frame.body));
      } catch {
        onMsg(frame.body);
      }
    });
  }

  disconnect(): void {
    this.client?.deactivate();
    this.client = null;
  }
}
