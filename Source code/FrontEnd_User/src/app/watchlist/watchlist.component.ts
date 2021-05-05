import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ApiService } from 'app/api.service';
import { AuthenticationService } from 'app/authentication/authentication.service';
import { MovieWithAvgRatings } from 'app/movie-list/model';
import { RateModalComponent } from 'app/shared/rate-modal/rate-modal.component';
import { ToastService } from 'app/toast/toast.service';
import { OwlOptions } from 'ngx-owl-carousel-o';

@Component({
  selector: 'app-watchlist',
  templateUrl: './watchlist.component.html',
  styleUrls: ['./watchlist.component.css']
})
export class WatchlistComponent implements OnInit {

  constructor(private modalService: NgbModal, private toast: ToastService, private http: HttpClient, private apiService: ApiService, public auth: AuthenticationService) { }
  watchlist: any[] = []
  orders: any[] = []
  recommends: MovieWithAvgRatings[] = []

  isLoaded: boolean = false
  isLoaded2: boolean = false
  isLoaded3: boolean = false

  customOptions: OwlOptions = {
    loop: true,
    margin: 25,
    nav: false,
    dots: true,
    autoplay: true,
    autoplayHoverPause: true,
    responsive: {
      0: { items: 1 },
      400: { items: 2 },
      740: { items: 4 },
      940: { items: 6 }
    },
  } 

  async ngOnInit(): Promise<void> 
  {
    await this.getWatchlist()
    this.isLoaded = true

    await this.getRecommends()

    await this.getOrders()
    this.isLoaded2 = true
  }
  async getWatchlist()
  {
    let url = this.apiService.backendHost + `/api/Movies/Watchlist/${this.auth.currentAccountValue.id}`;
    this.watchlist = await this.http.get<any[]>(url).toPromise();
  }

  async getOrders()
  {
    let url = this.apiService.backendHost + `/api/Orders/${this.auth.currentAccountValue.id}`;
    this.orders = await this.http.get<any[]>(url).toPromise();
  }

  async getRecommends()
  {
    this.isLoaded3 = false
    let url = this.apiService.backendHost + `/api/Movies/Recommend/${this.auth.currentAccountValue.id}`;
    let result = await this.http.get<MovieWithAvgRatings[]>(url).toPromise();
    this.isLoaded3 = true;
    if (result == null) return;
    this.recommends = result;
  }

  async rateMovie(event: any, id: number)
  {
    let movie = this.recommends.find(m => m.movie.id == id)
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

    const rated = event.currentTarget.classList.contains('rated');
    const modalRef = this.modalService.open(RateModalComponent, {windowClass: "rate"});
    modalRef.componentInstance.movie = movie.movie
    modalRef.componentInstance.rated = rated

    modalRef.result.then(async (result: any) => 
    {
      if (typeof(result) == 'object') // Post or update thành công
      {
        movie.ratings = result.ratings
        if (this.auth.activityStorage.rateIds.find(r => r == movie.movie.id)) this.toast.toastSuccess('Đánh giá phim thành công!')
        else this.toast.toastSuccess('Xóa đánh giá thành công!')
        // await this.getRecommends()
      }
      else if (result == 'Failed') this.toast.toastError('Post đánh giá không thành công!')
      else if (result == 'Delete Failed' && rated) this.toast.toastError('Xóa đánh giá không thành công!')
      else if (result == 'Failed' && !rated) this.toast.toastError('Post đánh giá không thành công!')     
    }, () => {})
  }

  async likeMovie(event: any, id: number)
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
