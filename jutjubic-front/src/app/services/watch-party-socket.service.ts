import { Injectable } from '@angular/core';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

//ifconfig u terminalu i vidi koja je adresa
//http://NOVA_IP_ADRESA:4200
// ng serve --host 0.0.0.0 --disable-host-check --proxy-config proxy.conf.json


@Injectable({ providedIn: 'root' })
export class WatchPartySocketService {
  private client: Client | null = null;

  connect(onConnected: () => void): void {
    const token = localStorage.getItem('token');

    if (this.client?.connected) {
      onConnected();
      return;
    }

    if (this.client) {
      this.client.deactivate();
    }

    this.client = new Client({
      webSocketFactory: () => new SockJS('/ws'),
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      reconnectDelay: 5000,
      debug: (msg) => {
        if (!msg.includes('PONG')) console.log('STOMP: ' + msg);
      }
    });

    this.client.onConnect = () => {
      console.log('STOMP CONNECTED OK');
      onConnected();
    };

    this.client.activate();
  }

  subscribeParty(partyId: string, onMsg: (msg: any) => void) {
    if (!this.client || !this.client.connected) {
      console.warn("Socket nije povezan, pokušaj pretplate će biti odbačen.");
      return { unsubscribe: () => {} };
    }

    const topic = `/topic/party/${partyId}`;
    console.log(`Pretplata na topic: ${topic}`);

    return this.client.subscribe(topic, (frame) => {
      try {
        const payload = JSON.parse(frame.body);
        console.log("Stigla poruka:", payload);
        onMsg(payload);
      } catch (e) {
        onMsg(frame.body);
      }
    });
  }

  disconnect(): void {
    this.client?.deactivate();
    this.client = null;
  }
}