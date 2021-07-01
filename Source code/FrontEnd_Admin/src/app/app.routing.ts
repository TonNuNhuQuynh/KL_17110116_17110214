import { NgModule } from '@angular/core';
import { CommonModule, } from '@angular/common';
import { BrowserModule  } from '@angular/platform-browser';
import { Routes, RouterModule } from '@angular/router';

//New import
import { AddMovieComponent } from './add-movie/add-movie.component';
import { ManageMoviesComponent } from './manage-movies/manage-movies.component';
import { ManageAccountsComponent } from './manage-accounts/manage-accounts.component';
import { ManageCinemaChainsComponent } from './manage-chains/manage-cinema-chains.component';
import { ProfileComponent } from './profile/profile.component';
import { VerifyEmailComponent } from './verify-email/verify-email.component';
import { RoleGuardService as RoleGuard } from './authentication/role-guard.service';
import { RolesService as Roles} from './manage-accounts/roles.service';

import { ResetPasswordComponent } from './reset-password/reset-password.component';
import { SendEmailComponent } from './reset-password/send-email/send-email.component';
import { NotFoundComponent } from './not-found/not-found.component';
import { HomeComponent } from './home/home.component';
import { ManageTasksComponent } from './manage-tasks/manage-tasks.component';
import { LoginComponent } from './login/login.component';
import { ManagePostsComponent } from './manage-posts/manage-posts.component';
import { PostReviewComponent } from './manage-posts/post-review/post-review.component';
import { ManageCategoryComponent } from './manage-category/manage-category.component';
import { StatisticsComponent } from './statistics/statistics.component';

const routes: Routes = [
    // { path: '', redirectTo: 'admin/statistics', pathMatch:'full' },
    { path: 'login', component: LoginComponent},

    { 
      path: 'admin/profile', 
      component: ProfileComponent,
      canActivate: [RoleGuard], 
      data: { expectedRoles: [Roles.admin, Roles.superAdmin]}
    },
    { path: 'verify', component: VerifyEmailComponent},
    { path: 'forgot-password', component: SendEmailComponent },
    { path: 'reset', component: ResetPasswordComponent },
    { path: 'not-found', component: NotFoundComponent },

    //Admin
    { path: '', redirectTo: 'admin/home', pathMatch:'full' },
    { path: 'admin', redirectTo: 'admin/home'},
    { 
      path: 'admin/home', 
      component: HomeComponent,
      canActivate: [RoleGuard], 
      data: { expectedRoles: [Roles.admin, Roles.superAdmin]}
    },

    { 
      path: 'admin/add-movie',
      component: AddMovieComponent,
      canActivate: [RoleGuard], 
      data: { expectedRoles: [Roles.admin, Roles.superAdmin]}
    },

    { 
      path: 'admin/manage-movies', 
      component: ManageMoviesComponent,
      canActivate: [RoleGuard], 
      data: { expectedRoles: [Roles.admin, Roles.superAdmin] } 
    },

    { 
      path: 'admin/manage-accounts',
      component: ManageAccountsComponent,
      canActivate: [RoleGuard], 
      data: { expectedRoles: [Roles.admin, Roles.superAdmin] }
    },

    { 
      path: 'admin/manage-chains',
      component: ManageCinemaChainsComponent,
      canActivate: [RoleGuard], 
      data: { expectedRoles: [Roles.superAdmin] }
    },

    { 
      path: 'admin/manage-tasks',
      component: ManageTasksComponent,
      canActivate: [RoleGuard], 
      data: { expectedRoles: [Roles.superAdmin, Roles.admin] }
    },

    { 
      path: 'admin/manage-posts',
      component: ManagePostsComponent,
      canActivate: [RoleGuard], 
      data: { expectedRoles: [Roles.superAdmin, Roles.admin] }
    },

    { 
      path: 'admin/review-post',
      component: PostReviewComponent,
      canActivate: [RoleGuard], 
      data: { expectedRoles: [Roles.superAdmin, Roles.admin] }
    },

    { 
      path: 'admin/manage-category',
      component: ManageCategoryComponent,
      canActivate: [RoleGuard], 
      data: { expectedRoles: [Roles.superAdmin] }
    },

    { 
      path: 'admin/statistics',
      component: StatisticsComponent,
      canActivate: [RoleGuard], 
      data: { expectedRoles: [Roles.superAdmin, Roles.admin] }
    },

    { path: '**', redirectTo: 'not-found' }
];

@NgModule({
  imports: [
    CommonModule,
    BrowserModule,
    RouterModule.forRoot(routes,{
      useHash: true
    })
  ],
  exports: [
  ],
})
export class AppRoutingModule { }
