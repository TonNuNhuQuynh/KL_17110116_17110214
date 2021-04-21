import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from 'app/api.service';
import { Location } from '@angular/common';
import { MovieWithAvgRatings } from 'app/movie-list/model';
import { AuthenticationService } from 'app/authentication/authentication.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastService } from 'app/toast/toast.service';
import { LoginModalComponent } from 'app/shared/login-modal/login-modal.component';
import { RateModalComponent } from 'app/shared/rate-modal/rate-modal.component';
import { OwlOptions } from 'ngx-owl-carousel-o';

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.css']
})
export class SearchComponent implements OnInit {

  constructor(private router: Router, private modalService: NgbModal, private toast: ToastService, private auth: AuthenticationService, private location: Location, private http: HttpClient, private apiService: ApiService, private route: ActivatedRoute) 
  { 
    this.router.routeReuseStrategy.shouldReuseRoute = function () { return false; };
  }

  keyByName: boolean = false;
  keyByActor: boolean = false;
  keyByDirector: boolean = false;
  keyByProducer: boolean = false;

  query: string
  key: string
  isLoaded: boolean = false
  movies: MovieWithAvgRatings[] = []
  isLoaded2: boolean = true
  total: number = 0
  news: any[] = []
  isLoadedMore: boolean = false

  customOptions: OwlOptions = {
    //center: true,
    loop: false,
    margin: 25,
    nav: false,
    dots: true,
    autoplay: false,
    autoplayHoverPause: true,
    autoWidth: true,
    responsive: {
      0: { items: 2 },
      400: { items: 2 },
      740: { items: 4 },
      940: { items: 6 }
    },
  }  

  async ngOnInit(): Promise<void> 
  {
    this.route.queryParams.subscribe(params => {

      if (params['name']) 
      {
        this.keyByName = true;
        this.query = params['name'];
      }
      else if (params['actor']) 
      {
        this.keyByActor = true;
        this.query = params['actor'];
      }
      else if (params['director']) 
      {
        this.keyByDirector = true;
        this.query = params['director'];
      }
      else if (params['producer']) 
      {
        this.keyByProducer = true;
        this.query = params['producer'];
      }
      if (this.query == null) this.location.back();
    });
    
    if (this.query != null) 
    {
      await this.searchMovies()
      await this.searchNews()
    }
  }
  async searchMovies()
  {
    let url = this.apiService.backendHost + '/api/Search/Movies?';
    if (this.keyByName) url += `name=${this.query}`;
    else if (this.keyByActor) url += `actor=${this.query}`;
    else if (this.keyByDirector) url += `director=${this.query}`;
    else url += `producer=${this.query}`;
    this.movies = await this.http.get<MovieWithAvgRatings[]>(url).toPromise();
    this.isLoaded = true;
  }

  async searchNews()
  {
    this.isLoaded2 = false
    let url = this.apiService.backendHost + `/api/Search/Posts?query=${this.query}`
    try
    {
      let result = await this.http.get<any>(url).toPromise();
      this.news = result.posts
      this.total = result.total
    }
    catch(e) { console.log(e) }
    this.isLoaded2 = true
  }

  async loadMore()
  {
    this.isLoadedMore = true;
    let url = this.apiService.backendHost + `/api/Search/LoadMore?query=${this.query}&start=${this.news.length}`;
    try
    {
      let result = await this.http.get<any[]>(url).toPromise()
      result.forEach(element => { this.news.push(element); });
    }
    catch(e) { console.log(e) }
    this.isLoadedMore = false;
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
    let movie = this.movies.find(m => m.movie.id == id)
    var release = new Date(movie.movie.releaseDate)
    release.setHours(0)
    release.setMinutes(0) 
    release.setSeconds(0)

    var now = new Date();

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
      const rated = event.currentTarget.classList.contains('rated')
      const modalRef = this.modalService.open(RateModalComponent, {windowClass: "rate"})
      modalRef.componentInstance.movie = movie.movie
      modalRef.componentInstance.rated = rated

      modalRef.result.then(async (result: any) => 
      {
        if (typeof(result) == 'object') // Post or update thành công
        {
          movie.ratings = result.ratings
          // {
          //   movie.movie = result.movie
          //   movie.ratings = result.ratings 
          // }
          if (this.auth.activityStorage.rateIds.find(r => r == movie.movie.id)) this.toast.toastSuccess('Đánh giá phim thành công!')
          else this.toast.toastSuccess('Xóa đánh giá thành công!')
        }
        else if (result == 'Failed' && rated) this.toast.toastError('Cập nhật đánh giá không thành công!');
        else if (result == 'Delete Failed' && rated) this.toast.toastError('Xóa đánh giá không thành công!');
        else if (result == 'Failed' && !rated) this.toast.toastError('Post đánh giá không thành công!');       
      }, () => {})
    }
  }
}
