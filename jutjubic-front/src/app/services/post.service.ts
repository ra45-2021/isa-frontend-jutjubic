import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PostService {
  private readonly apiUrl = '/api/posts';

  constructor(private http: HttpClient) {}

  createPost(formData: FormData): Observable<any> {
    return this.http.post(this.apiUrl, formData);
  }
}
