import { HttpClient } from '@angular/common/http';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ApiService } from 'app/api.service';
import { AuthenticationService } from 'app/authentication/authentication.service';
import { MovieWithAvgRatings } from 'app/movie-list/model';
import { LoginModalComponent } from 'app/shared/login-modal/login-modal.component';
import { RateModalComponent } from 'app/shared/rate-modal/rate-modal.component';
import { ToastService } from 'app/toast/toast.service';


@Component({
  selector: 'app-movie-list',
  templateUrl: './movie-list.component.html',
  styleUrls: ['./movie-list.component.css']
})
export class MovieListComponent implements OnInit, OnDestroy{

  constructor(private modalService: NgbModal, private auth: AuthenticationService, private toast: ToastService, private http: HttpClient, private apiService: ApiService, route: ActivatedRoute) 
  { 
    this.snapshot = route.snapshot;
  }
  
  ngOnDestroy(): void 
  {
    sessionStorage.removeItem('genreId');
    sessionStorage.removeItem('languageId');
  }

  movies: MovieWithAvgRatings[] = [];
  filterMovies: MovieWithAvgRatings[];
  status: number = 0;
  note: string = '';
  name: string = '';

  genres: any[];
  languages: any[];
  genreId: number;
  languageId: number;
  gSelectAll: string = 'Thể loại';
  lSelectAll: string = 'Ngôn ngữ';

  snapshot: any;
  loaded: boolean = false;

  lastGId: number = 0
  lastLId: number = 0

  async ngOnInit(): Promise<void> 
  {
    this.status = this.snapshot.data.status;

    if (this.status == 1) {
      this.name = "Phim đang chiếu";
      this.note = "hiện đang chiếu";
    }

    else if (this.status == 2) 
    {
      this.name = "Phim sắp chiếu";
      this.note = "dự kiến khởi chiếu";
    }
    
    await this.getGenres();
    await this.getLanguages();
    await this.getMovies();

  
    this.genreId = sessionStorage.getItem('genreId') ? Number(sessionStorage.getItem('genreId')): this.lastGId + 1;
    this.languageId = sessionStorage.getItem('languageId') ? Number(sessionStorage.getItem('languageId')): this.lastLId + 1;
    
    this.filterGenres(this.genreId, this.genreId > this.lastGId? '': this.genres.find(g => g.id == this.genreId).name);
    this.filterLanguages(this.languageId, this.languageId > this.lastLId? '': this.languages.find(l => l.id == this.languageId).name);

    this.loaded = true;
  }

  filterGenres(value: number, text: string)
  {
    this.genreId = value;
    sessionStorage.setItem('genreId', this.genreId.toString())
    if (value > this.lastGId)  this.gSelectAll = 'Thể loại';
    else this.gSelectAll = text;
    this.filter();
  }

  filterLanguages(value: number, text: string)
  {
    this.languageId = value;
    sessionStorage.setItem('languageId', this.languageId.toString())
    if (value > this.lastLId) this.lSelectAll = 'Ngôn ngữ';
    else this.lSelectAll = text;
    this.filter();
  }

  filter()
  {
    let temp: MovieWithAvgRatings[] = [];
    temp = this.genreId <= this.genres.length? this.movies.filter(m => m.movie.genres.indexOf(this.genreId) > -1): this.movies;
    temp = this.languageId <= this.languages.length? temp.filter(m => m.movie.languageId == this.languageId): temp;
    this.filterMovies = temp;  
  }
  async getMovies()
  {
    let url = this.apiService.backendHost + `/api/Movies/Status/${this.status}`;
    this.movies = await this.http.get<MovieWithAvgRatings[]>(url).toPromise();
    this.filterMovies = this.movies;
  }
  async getGenres()
  {
    let url = this.apiService.backendHost + "/api/Genres";
    this.genres = await this.http.get<any>(url).toPromise();
    this.lastGId = this.genres[this.genres.length - 1].id
  }
  async getLanguages()
  {
    let url = this.apiService.backendHost + "/api/Languages";
    this.languages = await this.http.get<any>(url).toPromise();
    this.lastLId = this.languages[this.languages.length - 1].id;
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
        console.log(url);
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
    var release = new Date(movie.movie.releaseDate);
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
          this.filter()
        }
        else if (result == 'Failed' && rated) this.toast.toastError('Cập nhật đánh giá không thành công!');
        else if (result == 'Delete Failed' && rated) this.toast.toastError('Xóa đánh giá không thành công!');
        else if (result == 'Failed' && !rated) this.toast.toastError('Post đánh giá không thành công!');       
      }, () => {})
    }
  }
  
}
