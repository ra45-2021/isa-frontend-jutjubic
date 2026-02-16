import { Injectable } from '@angular/core';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

@Injectable({ providedIn: 'root' })
export class WatchPartySocketService {
  private client: Client | null = null;

  connect(onConnected: () => void): void {
    const token = localStorage.getItem('token');

    // Ako je već povezan sa istim klijentom, samo izvrši callback
    if (this.client?.connected) {
      onConnected();
      return;
    }

    // Ako postoji stari klijent, ugasi ga pre pravljenja novog
    if (this.client) {
      this.client.deactivate();
    }

    this.client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
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
    // Ako se pozove pretplata a klijent pukne ili nije povezan, 
    // ovaj deo osigurava da ne pukne cela komponenta
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