import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { HomeComponent } from './layout/home/home.component';
import { LoginComponent } from './components/auth/login/login.component';
import { ProfileComponent } from './components/profile/profile.component';

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      { path: 'home', component: HomeComponent },
      { path: 'login', component: LoginComponent },
      { path: 'profile/:username', component: ProfileComponent },
      { path: '', redirectTo: 'home', pathMatch: 'full' }

    ]
  }
];
