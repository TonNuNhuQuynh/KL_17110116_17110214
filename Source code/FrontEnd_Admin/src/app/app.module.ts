import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { RouterModule } from '@angular/router';
import { AppRoutingModule } from './app.routing';
import { HttpClientModule } from '@angular/common/http';

import { AppComponent } from './app.component';
import { NavbarComponent } from './shared/navbar/navbar.component';
import { FooterComponent } from './shared/footer/footer.component';
import { DatePipe, DecimalPipe } from '@angular/common';
//Components
import { AddMovieComponent } from './add-movie/add-movie.component';
import { ManageMoviesComponent } from './manage-movies/manage-movies.component';
//Services
import { ApiService } from './api.service';
import { RolesService } from './manage-accounts/roles.service';
import { AuthenticationService } from './authentication/authentication.service';
import { MovieModalComponent } from './shared/movie-modal/movie-modal.component';
import { ToastService } from './toast/toast.service';
import { RoleGuardService as RoleGuard } from './authentication/role-guard.service';
// import { LocationService } from './location.service';
import { StorageService } from './storage.service';
//Package
import { MultiSelectAllModule } from '@syncfusion/ej2-angular-dropdowns';
import { DropDownListModule } from '@syncfusion/ej2-angular-dropdowns';
import { DataTablesModule } from 'angular-datatables';
import { MovieCastModalComponent } from './manage-movies/movie-cast-modal/movie-cast-modal.component';
import { ToastrModule } from 'ngx-toastr';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ManageAccountsComponent } from './manage-accounts/manage-accounts.component';
import { AddAdminModalComponent } from './manage-accounts/add-admin-modal/add-admin-modal.component';
import { ManageCinemaChainsComponent } from './manage-chains/manage-cinema-chains.component';
import { EditCinemaModalComponent } from './manage-chains/edit-cinema-modal/edit-cinema-modal.component';
import { ProfileComponent } from './profile/profile.component';
import { VerifyEmailComponent } from './verify-email/verify-email.component';
// Owl Carousel
import { ResetPasswordComponent } from './reset-password/reset-password.component';
import { SendEmailComponent } from './reset-password/send-email/send-email.component';
import { NotFoundComponent } from './not-found/not-found.component';
import { UpdatesComponent } from './manage-chains/updates/updates.component';
import { WaitingComponent } from './manage-chains/waiting/waiting.component';
import { HomeComponent } from './home/home.component'; 
// Firebase
import { AngularFireModule } from "@angular/fire";
import { AngularFireStorageModule, AngularFireStorage } from "@angular/fire/storage";
import { environment } from "../environments/environment";
import { ManageTasksComponent } from './manage-tasks/manage-tasks.component';
import { TaskModalComponent } from './manage-tasks/task-modal/task-modal.component';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import { LoginComponent } from './login/login.component';
import { ManagePostsComponent } from './manage-posts/manage-posts.component';
import { PostReviewComponent } from './manage-posts/post-review/post-review.component';
import { JwtModule } from '@auth0/angular-jwt';
import { ManageCategoryComponent } from './manage-category/manage-category.component';
import { StatisticsComponent } from './statistics/statistics.component';

export function tokenGetter() {
  return sessionStorage.getItem(StorageService.token)? sessionStorage.getItem(StorageService.token): localStorage.getItem(StorageService.token);
}

@NgModule({
  declarations: [
    AppComponent,
    NavbarComponent,
    FooterComponent,
    AddMovieComponent,
    ManageMoviesComponent,
    MovieModalComponent,
    MovieCastModalComponent,
    ManageAccountsComponent,
    AddAdminModalComponent,
    ManageCinemaChainsComponent,
    EditCinemaModalComponent,
    ProfileComponent,
    VerifyEmailComponent,
    ResetPasswordComponent,
    SendEmailComponent,
    NotFoundComponent,
    UpdatesComponent,
    WaitingComponent,
    HomeComponent,
    ManageTasksComponent,
    TaskModalComponent,
    LoginComponent,
    ManagePostsComponent,
    PostReviewComponent,
    ManageCategoryComponent,
    StatisticsComponent,
  ],
  imports: [
    BrowserModule,
    NgbModule,
    FormsModule,
    RouterModule,
    AppRoutingModule,
    HttpClientModule,
    MultiSelectAllModule,
    DropDownListModule,
    DataTablesModule,
    ToastrModule.forRoot(),
    BrowserAnimationsModule,
    AngularFireStorageModule,
    AngularFireModule.initializeApp(environment.firebaseConfig, "cloud"),
    CKEditorModule,
    JwtModule.forRoot({
      config: {
        tokenGetter: tokenGetter,
        allowedDomains: ["tlcn-moviereviews.somee.com", "localhost:44320"]
      } })
  ],
  providers: [
    ApiService, 
    RolesService,
    DatePipe,
    AuthenticationService,
    ToastService,
    RoleGuard,
    StorageService,
    AngularFireStorage,
    DecimalPipe
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }

