import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { HomeComponent } from './layout/home/home.component';
import { LoginComponent } from './components/auth/login/login.component';
import { RegisterComponent } from './components/auth/register/register.component';
import { ProfileComponent } from './components/profile/profile.component';
import { UploadComponent } from './components/upload/upload.component';
import { WatchVideoComponent } from './components/watch-video/watch-video.component';
import { authGuard } from './components/auth/auth.guard';
import { WatchPartiesComponent } from './components/watch-parties/watch-parties.component';
import { PartyCreateComponent } from './components/party-create/party-create.component';
import { PartyViewComponent } from './components/party-view/party-view.component';

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      { path: 'home', component: HomeComponent },
      { path: 'video/:id', component: WatchVideoComponent },
      { path: 'login', component: LoginComponent },
      { path: 'register', component: RegisterComponent },
      { path: 'profile/:username', component: ProfileComponent },
      { path: 'upload', component: UploadComponent, canActivate: [authGuard] },
      { path: 'watch-parties', component: WatchPartiesComponent },
      { path: 'party-create', component: PartyCreateComponent },
      { path: 'party-create/:partyId', component: PartyCreateComponent },
      { path: 'party-view/:partyId', component: PartyViewComponent },
      { path: '', redirectTo: 'home', pathMatch: 'full' }

    ]
  }
];
