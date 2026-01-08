import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PostService } from '../../services/post.service';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.css']
})
export class UploadComponent {
  title = '';
  description = '';
  tags = '';
  locationLat = '';
  locationLon = '';

  thumbnailFile: File | null = null;
  videoFile: File | null = null;

  thumbnailPreviewUrl: string | null = null;
  videoPreviewName: string | null = null;

  submitting = false;
  error: string | null = null;
  success: string | null = null;

  // Drag & drop states
  thumbnailDragOver = false;
  videoDragOver = false;

  constructor(private postService: PostService, private router: Router) {}

  // ===== THUMBNAIL HANDLERS =====
  onThumbnailSelected(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.setThumbnailFile(file);
  }

  onThumbnailDrop(ev: DragEvent) {
    ev.preventDefault();
    this.thumbnailDragOver = false;
    const file = ev.dataTransfer?.files?.[0] ?? null;
    if (file && file.type.startsWith('image/')) {
      this.setThumbnailFile(file);
    }
  }

  onThumbnailDragOver(ev: DragEvent) {
    ev.preventDefault();
    this.thumbnailDragOver = true;
  }

  onThumbnailDragLeave(ev: DragEvent) {
    ev.preventDefault();
    this.thumbnailDragOver = false;
  }

  setThumbnailFile(file: File | null) {
    if (this.thumbnailPreviewUrl) {
      URL.revokeObjectURL(this.thumbnailPreviewUrl);
    }
    this.thumbnailFile = file;
    this.thumbnailPreviewUrl = file ? URL.createObjectURL(file) : null;
  }

  removeThumbnail() {
    this.setThumbnailFile(null);
  }

  // ===== VIDEO HANDLERS =====
  onVideoSelected(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.setVideoFile(file);
  }

  onVideoDrop(ev: DragEvent) {
    ev.preventDefault();
    this.videoDragOver = false;
    const file = ev.dataTransfer?.files?.[0] ?? null;
    if (file && file.type.startsWith('video/')) {
      this.setVideoFile(file);
    }
  }

  onVideoDragOver(ev: DragEvent) {
    ev.preventDefault();
    this.videoDragOver = true;
  }

  onVideoDragLeave(ev: DragEvent) {
    ev.preventDefault();
    this.videoDragOver = false;
  }

  setVideoFile(file: File | null) {
    this.videoFile = file;
    this.videoPreviewName = file ? file.name : null;
  }

  removeVideo() {
    this.setVideoFile(null);
  }

  // ===== SUBMIT =====
  submit() {
    this.error = null;
    this.success = null;

    if (!this.title.trim()) {
      this.error = 'Title is required.';
      return;
    }
    if (!this.thumbnailFile) {
      this.error = 'Thumbnail is required.';
      return;
    }
    if (!this.videoFile) {
      this.error = 'Video is required.';
      return;
    }

    const fd = new FormData();
    fd.append('title', this.title.trim());
    fd.append('description', this.description ?? '');
    fd.append('tags', this.tags ?? '');

    if (this.locationLat.trim()) fd.append('locationLat', this.locationLat.trim());
    if (this.locationLon.trim()) fd.append('locationLon', this.locationLon.trim());

    fd.append('thumbnail', this.thumbnailFile);
    fd.append('video', this.videoFile);

    this.submitting = true;

    this.postService.createPost(fd).subscribe({
      next: () => {
        this.success = 'Upload successful!';
        setTimeout(() => this.router.navigateByUrl('/home'), 1000);
      },
      error: (err) => {
        this.error = err?.error?.message || err?.error || 'Upload failed.';
        this.submitting = false;
      },
      complete: () => {
        this.submitting = false;
      }
    });
  }

  ngOnDestroy() {
    if (this.thumbnailPreviewUrl) {
      URL.revokeObjectURL(this.thumbnailPreviewUrl);
    }
  }
}