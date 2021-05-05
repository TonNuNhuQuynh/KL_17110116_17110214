import { HttpClient } from '@angular/common/http';
import { AfterViewChecked, ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { NgbCarousel, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ApiService } from 'app/api.service';
import { AuthenticationService } from 'app/authentication/authentication.service';
import { MovieWithAvgRatings } from 'app/movie-list/model';
import { LoginModalComponent } from 'app/shared/login-modal/login-modal.component';
import { Movie } from 'app/movie-details/model';
import { RateModalComponent } from 'app/shared/rate-modal/rate-modal.component';
import { ToastService } from 'app/toast/toast.service';
import { OwlOptions, SlidesOutputData } from 'ngx-owl-carousel-o';
import * as $ from 'jquery';
import { TrailerModalComponent } from 'app/movie-details/trailer-modal/trailer-modal.component';
import { Subscription } from 'rxjs/Subscription';
import { DatePipe } from '@angular/common';

@Component({
    selector: 'app-components',
    templateUrl: './components.component.html',
    styleUrls: ['./components.component.css']
})

export class ComponentsComponent implements OnInit, OnDestroy, AfterViewChecked {
   
  top4Movies: MovieWithAvgRatings[] = []
  isLoaded: boolean = false
  weeklyFavoriteMovies: Movie[] = []
  isLoaded1: boolean = false
  nowMovies: MovieWithAvgRatings[] = []
  isLoaded2: boolean = false
  isLoaded3: boolean = false
  latestMovies: Movie[] = []
  isLoaded4: boolean = false
  recommends: MovieWithAvgRatings[] = []
  isLoaded5: boolean = false
  latestPosts: any[] = []
  thumbnails: any[] = []

  activeId: number = 0;
  @ViewChild('largeCarousel') lgCarousel: NgbCarousel;

  authSubcription: Subscription

  // config of Weekly liked movies carousel
  customOptions: OwlOptions = {
    center: true,
    loop:true,
    margin: 25,
    nav: false,
    dots: true,
    autoplay: true,
    slideTransition: 'linear',
    autoplayTimeout: 6000,
    autoplaySpeed: 6000,
    autoplayHoverPause: false,
    responsive: {
      0: { items: 2 },
      400: { items: 2 },
      740: { items: 4 },
      940: { items: 6 }
    },
  }
  // config of In theaters movies carousel
  customOptions2: OwlOptions = {
    loop: true,
    margin: 25,
    nav: false,
    dots: true,
    autoplay: true,
    autoplayHoverPause: true,
    responsive: {
      0: { items: 2 },
      400: { items: 2 },
      740: { items: 4 },
      940: { items: 6 }
    },
  }  
  // Config of New trailers carousel
  customOptions3: OwlOptions = {
    pullDrag: true,
    center: true,
    loop: true,
    margin: 20,
    nav: true,
    dots: false,
    autoplay: true,
    autoplayHoverPause: true,
    autoWidth: true,
    responsive: {
      0: { items: 1 },
      400: { items: 1 },
      740: { items: 1 },
      940: { items: 2 }
    },
    navText : ["<i class='fa fa-chevron-left'></i>","<i class='fa fa-chevron-right'></i>"],
  }  
  // Config for News carousel
  customOptions4: OwlOptions = {
    loop: true,
    nav: true,
    dots: false,
    autoplay: true,
    mouseDrag: true,
    autoplayHoverPause: true,
    responsive: {
      0: { items: 1 },
      400: { items: 1 },
      740: { items: 1 },
      940: { items: 1 }
    },
    navText : ["<i class='fa fa-chevron-left'></i>","<i class='fa fa-chevron-right'></i>"],
    navSpeed: 700
  }
  isBack: boolean = false

  // customOptions5: OwlOptions = {
  //   loop: true,
  //   nav: false,
  //   dots: false,
  //   autoplay: true,
  //   mouseDrag: false,
  //   autoplayHoverPause: false,
  //   items: 3,
  //   animateOut: 'slideOutUp',
  //   animateIn: 'slideInUp'
  // }

  constructor(private datePipe: DatePipe, private chRef: ChangeDetectorRef, private modalService: NgbModal, private auth: AuthenticationService, private http: HttpClient, private toast: ToastService, private apiService: ApiService) {}
  
  ngAfterViewChecked(): void {
    this.chRef.detectChanges()
  }
  
  ngOnDestroy(): void {
    if (this.authSubcription) this.authSubcription.unsubscribe()
  }
    
  async ngOnInit() 
  {
    await this.getTop4Movies();
    this.fadeOut()
    await this.getWeeklyFavoriteMovies()
    await this.getLatestPosts()
    await this.getMovies()
    this.authSubcription = this.auth.currentAccountSubject.subscribe(async account => {
      if (account != null) await this.getRecommends()
    })
    await this.getLatest();
    let _this = this
    $("#horizontal-gallery .owl-prev").on('click', function() {
      _this.isBack = true
    })
  }
  fadeOut()
  {
    var _this = this;
    $('#loading').fadeOut(1000, function() {
      _this.isLoaded = true;
    });
  }
  async getTop4Movies()
  {
    let url = this.apiService.backendHost + "/api/Movies/Top4";
    this.top4Movies = await this.http.get<MovieWithAvgRatings[]>(url).toPromise();
  }

  async getWeeklyFavoriteMovies()
  {
    let url = this.apiService.backendHost + "/api/Movies/Weekly";
    this.weeklyFavoriteMovies = await this.http.get<Movie[]>(url).toPromise();
    this.isLoaded1 = true;
  }
  pickSlide(id: number)
  {
    this.lgCarousel.select(`lg-slide-${id}`);
  }
  
  async getMovies()
  {
    let url = this.apiService.backendHost + `/api/Movies/Status/1`;
    this.nowMovies = await this.http.get<MovieWithAvgRatings[]>(url).toPromise();
    if (this.nowMovies.length > 12) this.nowMovies = this.nowMovies.slice(0, 11);
    this.isLoaded2 = true;
  }
  openLoginModal()
  {
    const modalRef = this.modalService.open(LoginModalComponent, {windowClass: "login"});
    modalRef.result.then(async (result: any) => {}, () => {})
  }
  async likeMovie(event: any, id: number)
  {
    if (this.auth.currentAccountValue == null) this.openLoginModal();
    else 
    {
      if (event.currentTarget.classList.contains('liked'))
      {
        let url = this.apiService.backendHost + `/api/MovieLikes/${id}`;
        try 
        {
          await this.http.delete(url).toPromise();
          this.toast.toastSuccess("Unlike phim thành công!");
          this.auth.updateLike(id, false);
        }
        catch (e) { this.toast.toastError("Unlike phim không thành công"); }
      }
      else 
      {
        let url = this.apiService.backendHost + `/api/MovieLikes`;
        try 
        {
          let postObject = {accountId: this.auth.currentAccountValue.id, movieId: id, date: new Date()}
          let result = await this.http.post(url, postObject).toPromise();
          if (result) 
          {
            this.toast.toastSuccess("Like phim thành công!")
            this.auth.updateLike(id, true);
          }
        }
        catch (e) { this.toast.toastError("Like phim không thành công"); }
      }
    }
  }
  async rateMovie(event: any, id: number)
  {
    let movie = this.nowMovies.find(m => m.movie.id == id) != undefined ? this.nowMovies.find(m => m.movie.id == id): this.recommends.find(m => m.movie.id == id)
    var release = new Date(movie.movie.releaseDate)
    release.setHours(0)
    release.setMinutes(0) 
    release.setSeconds(0)

    var now = new Date()

    if (release.getTime() > now.getTime()) 
    {
      var hDiff = release.getTime() - now.getTime() / 3600000;
      if (hDiff > 48) 
      { 
        this.toast.toastInfo('Chỉ được đánh giá phim 2 ngày trước ngày khởi chiếu!');
        return;
      }
    }

    if (this.auth.currentAccountValue == null) this.openLoginModal();
    else 
    {
      const rated = event.currentTarget.classList.contains('rated');
      const modalRef = this.modalService.open(RateModalComponent, {windowClass: "rate"});
      modalRef.componentInstance.movie = movie.movie
      modalRef.componentInstance.rated = rated

      modalRef.result.then(async (result: any) => 
      {
        if (typeof(result) == 'object') // Post or update thành công
        {
          // let movie = this.nowMovies.find(m => m.movie.id == result.movie.id)
          // if (movie) movie.ratings = result.ratings
          // {
          //   movie.movie = result.movie
          //   movie.ratings = result.ratings 
          // }
          movie.ratings = result.ratings
          if (this.auth.activityStorage.rateIds.find(r => r == movie.movie.id)) this.toast.toastSuccess('Đánh giá phim thành công!')
          else this.toast.toastSuccess('Xóa đánh giá thành công!')
          //await this.getRecommends()
        }
        else if (result == 'Failed' && rated) this.toast.toastError('Cập nhật đánh giá không thành công!');
        else if (result == 'Delete Failed' && rated) this.toast.toastError('Xóa đánh giá không thành công!');
        else if (result == 'Failed' && !rated) this.toast.toastError('Post đánh giá không thành công!');       
      }, () => {})
    }
  }
  async getLatest()
  {
    let url = this.apiService.backendHost + "/api/Movies/Latest";
    this.latestMovies = await this.http.get<Movie[]>(url).toPromise();
    this.isLoaded3 = true;
  }
  async getRecommends()
  {
    this.isLoaded4 = false
    let url = this.apiService.backendHost + `/api/Movies/Recommend/${this.auth.currentAccountValue.id}`;
    let result = await this.http.get<MovieWithAvgRatings[]>(url).toPromise();
    this.isLoaded4 = true;
    if (result == null) return;
    this.recommends = result;
  }

  async getLatestPosts()
  {
    let url = this.apiService.backendHost + "/api/Posts/8RecentPosts";
    this.latestPosts = await this.http.get<any[]>(url).toPromise();
    this.isLoaded5 = true;
    this.thumbnails = this.latestPosts.slice(0, 4)
  }

  openTrailerModal(url: string)
  {
    if (url == null || url == '') 
    {
      this.toast.toastInfo('Trailer của phim chưa được cập nhật!')
      return
    }
    const modalRef = this.modalService.open(TrailerModalComponent, {windowClass: "rate"});
    modalRef.componentInstance.url = url;
    modalRef.result.then( () => {}, () => {})
  }

  calculateDiff(date: string): string
  {
    let d2: Date = new Date();
    let d1 = new Date(date);
    // var diffYears = d2.getFullYear() - d1.getFullYear()
    // if (diffYears >= 1) return diffYears + " năm trước"
    // var diffMonths = diffYears * 12 + (d2.getMonth() - d1.getMonth())
    // if (diffMonths >= 1) return diffMonths + " tháng trước"
    var diffMs = d2.getTime() - d1.getTime()
    var diffDays = Math.floor(diffMs / 86400000); // days
    var diffHrs = Math.floor((diffMs % 86400000) / 3600000); // hours
    var diffMins = Math.round(((diffMs % 86400000) % 3600000) / 60000); // minutes
    if (diffDays > 30) return this.datePipe.transform(d1, 'dd/MM/yyyy')
    if (diffDays >= 1 && diffDays <= 30) return diffDays + " ngày trước"
    if (diffHrs >= 1) return diffHrs + " giờ trước"
    if (diffMins >= 1) return diffMins + " phút trước"
    else return "Vừa xong";
  }
  changeSlide(event: SlidesOutputData)
  {
    let id = Number(event.slides[0] != undefined ? event.slides[0].id: 0)
    if (id > 0)
    {
      let _this = this
      if (this.isBack)
      {
        let index = _this.latestPosts.findIndex(p => p.id == id)
        let preIndex = index > 0 ? index - 1: this.latestPosts.length - 1
        
        $("#vertical-thumb").find(`#${this.thumbnails[this.thumbnails.length - 1].id}`).slideDown(500, "linear", function() {
          _this.thumbnails.pop()
          _this.thumbnails.unshift(_this.latestPosts[preIndex])
        })
        _this.isBack = false
      }
      else
      {
        $("#vertical-thumb").find(`#${id}`).slideUp(function() {
          _this.thumbnails.shift()
          let lastIndex = _this.latestPosts.findIndex(p => p.id == _this.thumbnails[_this.thumbnails.length - 1].id)
          if (lastIndex < _this.latestPosts.length - 1) _this.thumbnails.push(_this.latestPosts[lastIndex + 1])
          else _this.thumbnails.push(_this.latestPosts[0])
        })
      }
    }
  }
}
