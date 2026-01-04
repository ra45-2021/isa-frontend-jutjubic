import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

interface UserPublic {
  id: number;
  username: string;
  displayName: string;
}

interface PostFeed {
  id: number;
  title: string;
  description?: string | null;
  videoUrl: string;
  thumbnailUrl?: string | null;
  createdAt: string;
  author: UserPublic;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {

  posts: PostFeed[] = [];
  loading = true;
  error = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<PostFeed[]>('/api/posts').subscribe({
      next: data => {
        this.posts = data;
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load posts';
        this.loading = false;
      }
    });
  }
}
