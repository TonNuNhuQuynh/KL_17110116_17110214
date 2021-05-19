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
import { ComponentsComponent } from './components/components.component';
import { DatePipe } from '@angular/common';

//Services
import { ApiService } from './api.service';
import { RolesService } from './authentication/roles.service';
import { AuthenticationService } from './authentication/authentication.service';
import { ToastService } from './toast/toast.service';
import { RoleGuardService as RoleGuard } from './authentication/role-guard.service';
import { StorageService } from './storage.service';
import { BookingGuardService as BookingGuard } from './book-tickets/booking-guard.service';
//Package
import { MultiSelectAllModule } from '@syncfusion/ej2-angular-dropdowns';
import { DropDownListModule } from '@syncfusion/ej2-angular-dropdowns';
import { DataTablesModule } from 'angular-datatables';
import { ToastrModule } from 'ngx-toastr';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ProfileComponent } from './profile/profile.component';
import { RegisterComponent } from './register/register.component';
import { VerifyEmailComponent } from './verify-email/verify-email.component';
import { LoginModalComponent } from './shared/login-modal/login-modal.component';
import { MovieListComponent } from './movie-list/movie-list.component';
import { RateModalComponent } from './shared/rate-modal/rate-modal.component';
import { LocationModalComponent } from './shared/location-modal/location-modal.component';
import { MovieDetailsComponent } from './movie-details/movie-details.component';
import { TrailerModalComponent } from './movie-details/trailer-modal/trailer-modal.component';
import { ReviewListComponent } from './movie-details/review-list/review-list.component';
import { ShowtimesComponent } from './movie-details/showtimes/showtimes.component';
import { BookTicketsComponent } from './book-tickets/book-tickets.component';
import { CinemaDetailsComponent } from './cinema-details/cinema-details.component';
import { CinemasModalComponent } from './shared/cinemas-modal/cinemas-modal.component';
import { SeatsComponent } from './book-tickets/seats/seats.component';
import { CheckoutComponent } from './book-tickets/checkout/checkout.component';
import { TicketDetailsComponent } from './book-tickets/ticket-details/ticket-details.component';
import { ErrorModalComponent } from './book-tickets/error-modal/error-modal.component';
// Owl Carousel
import { CarouselModule } from 'ngx-owl-carousel-o';
import { SearchComponent } from './search/search.component';
import { ResetPasswordComponent } from './reset-password/reset-password.component';
import { SendEmailComponent } from './reset-password/send-email/send-email.component';
import { CinemaChainComponent } from './cinema-chain/cinema-chain.component';
import { NotFoundComponent } from './not-found/not-found.component';
import { WatchlistComponent } from './watchlist/watchlist.component';
// Firebase
import { AngularFireModule } from "@angular/fire";
import { AngularFireStorageModule, AngularFireStorage } from "@angular/fire/storage";
import { environment } from "../environments/environment";
//Social
import { SocialLoginModule, SocialAuthServiceConfig } from 'angularx-social-login';
import { GoogleLoginProvider, FacebookLoginProvider } from 'angularx-social-login';
import { WriterComponent } from './writer/writer.component';
import { TaskListComponent } from './writer/task-list/task-list.component';
import { PostListComponent } from './writer/post-list/post-list.component';
import { TaskDetailsComponent } from './writer/task-details/task-details.component';
import { PostDetailsComponent } from './writer/post-details/post-details.component';
import { HomeComponent } from './writer/home/home.component';
import { PostReviewComponent } from './writer/post-review/post-review.component';
import { NavbarWriterComponent } from './writer/navbar-writer/navbar-writer.component';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import { PickTaskComponent } from './writer/pick-task/pick-task.component';
import { JwtModule } from '@auth0/angular-jwt';
import { NewsListComponent } from './news-list/news-list.component';
import { NewsComponent } from './movie-details/news/news.component';
import { ViewPostComponent } from './view-post/view-post.component';

export function tokenGetter() {
  return sessionStorage.getItem(StorageService.token)? sessionStorage.getItem(StorageService.token): localStorage.getItem(StorageService.token);
}

@NgModule({
  declarations: [
    AppComponent,
    NavbarComponent,
    FooterComponent,
    ProfileComponent,
    RegisterComponent,
    VerifyEmailComponent,
    LoginModalComponent,
    MovieListComponent,
    RateModalComponent,
    LocationModalComponent,
    MovieDetailsComponent,
    TrailerModalComponent,
    ReviewListComponent,
    ShowtimesComponent,
    BookTicketsComponent,
    CinemaDetailsComponent,
    CinemasModalComponent,
    SeatsComponent,
    CheckoutComponent,
    TicketDetailsComponent,
    ErrorModalComponent,
    ComponentsComponent,
    SearchComponent,
    ResetPasswordComponent,
    SendEmailComponent,
    CinemaChainComponent,
    NotFoundComponent,
    WatchlistComponent,
    WriterComponent,
    TaskListComponent,
    PostListComponent,
    TaskDetailsComponent,
    PostDetailsComponent,
    HomeComponent,
    PostReviewComponent,
    NavbarWriterComponent,
    PickTaskComponent,
    NewsListComponent,
    NewsComponent,
    ViewPostComponent,
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
    CarouselModule,
    AngularFireStorageModule,
    AngularFireModule.initializeApp(environment.firebaseConfig, "cloud"),
    SocialLoginModule,
    CKEditorModule,
    JwtModule.forRoot({
      config: {
        tokenGetter: tokenGetter, allowedDomains: ["tlcn-moviereviews.somee.com", "localhost:44320"]
    }}),
  ],
  providers: [
    ApiService, 
    RolesService,
    DatePipe,
    AuthenticationService,
    ToastService,
    RoleGuard,
    BookingGuard,
    StorageService,
    AngularFireStorage,
    {
      provide: 'SocialAuthServiceConfig',
      useValue: {
        autoLogin: false,
        providers: [
          {
            id: GoogleLoginProvider.PROVIDER_ID,
            provider: new GoogleLoginProvider('1096081760606-a7r7k1hr273ggvoji86ejurmd3lderp6.apps.googleusercontent.com')
          },
          {
            id: FacebookLoginProvider.PROVIDER_ID,
            provider: new FacebookLoginProvider('120742826608406')
          },
        ],
      } as SocialAuthServiceConfig
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }

