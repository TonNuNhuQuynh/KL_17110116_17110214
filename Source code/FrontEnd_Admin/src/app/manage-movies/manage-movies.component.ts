import { ChangeDetectorRef, Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { MovieWithAvgRatings } from './model';
import { HttpClient } from '@angular/common/http';
import { ApiService } from 'app/api.service';
import { Subject } from 'rxjs';
import { DataTableDirective } from 'angular-datatables';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { MovieModalComponent } from 'app/shared/movie-modal/movie-modal.component';
import { DatePipe } from '@angular/common';
import { Movie } from 'app/shared/movie-modal/model';
import { MovieCastModalComponent } from 'app/manage-movies/movie-cast-modal/movie-cast-modal.component';
import { ToastService } from 'app/toast/toast.service';

@Component({
  selector: 'app-manage-movies',
  templateUrl: './manage-movies.component.html',
  styleUrls: ['./manage-movies.component.css']
})
export class ManageMoviesComponent implements OnInit, OnDestroy {

  movies: MovieWithAvgRatings[];
  filterMovies: MovieWithAvgRatings[];

  url: string;
  dtOptions: DataTables.Settings = {};
  dtTrigger: Subject<any> = new Subject();
  @ViewChild(DataTableDirective) dtElement: DataTableDirective;

  genres: any[];
  languages: any[];
  statuses: any[];

  genreId: number;
  languageId: number;
  statusId: number;

  lastGId: number = 0
  lastLId: number = 0
  lastSId: number = 0

  gSelectAll: string = 'Thể loại';
  lSelectAll: string = 'Ngôn ngữ';
  sSelectAll: string = 'Trạng thái';

  constructor(private http: HttpClient, private toast: ToastService, private apiService: ApiService, private chRef : ChangeDetectorRef, private datePipe: DatePipe, private modalService: NgbModal) { }

  ngOnDestroy(): void {
    this.dtTrigger.unsubscribe();
  }
  
  async ngOnInit(): Promise<void> 
  {
    this.dtOptions = {
      pagingType: 'full_numbers',
      lengthMenu: [10, 15, 20],
      autoWidth: true,
      columnDefs: [ { "orderable": false, "targets": 0 }, 
                    {"visible": false, "targets": 5} ],
      order: [[5, 'desc']]
    };

    this.movies = []
    this.filterMovies = []
    this.genres = []
    this.languages = []
    this.statuses = []

    this.url = this.apiService.backendHost + "/api/Movies"
    await this.getMovies()
    this.filterMovies = this.movies
    this.chRef.detectChanges()
    this.dtTrigger.next()

    await this.getGenres()
    await this.getLanguages()
    await this.getStatuses()

    this.genreId = this.lastGId + 1
    this.languageId = this.lastLId + 1
    this.statusId = this.lastSId + 1

    this.getRatings()
  }

  async getMovies()
  {
    this.movies = await this.http.get<MovieWithAvgRatings[]>(this.url).toPromise();
  }
  async getGenres()
  {
    let url = this.apiService.backendHost + "/api/Genres";
    this.genres = await this.http.get<any>(url).toPromise();
    this.lastGId = this.genres[this.genres.length - 1].id;
  }
  async getLanguages()
  {
    let url = this.apiService.backendHost + "/api/Languages";
    this.languages = await this.http.get<any>(url).toPromise();
    this.lastLId = this.languages[this.languages.length - 1].id;
  }
  async getStatuses()
  {
    let url = this.apiService.backendHost + "/api/MovieStatus";
    this.statuses = await this.http.get<any>(url).toPromise();
    this.lastSId = this.statuses[this.statuses.length - 1].id;
  }
  filter()
  {
    let temp: MovieWithAvgRatings[] = [];
    temp = this.genreId <= this.genres.length? this.movies.filter(m => m.movie.genres.indexOf(this.genreId) > -1): this.movies;
    temp = this.languageId <= this.languages.length? temp.filter(m => m.movie.languageId == this.languageId): temp;
    temp = this.statusId <= this.statuses.length? temp.filter(m => m.movie.movieStatusId == this.statusId): temp;
    this.filterMovies = temp;  
    this.rerender();
  }
  filterGenres(value: number, text: string)
  {
    this.genreId = value;
    if (value > this.lastGId)  this.gSelectAll = 'Thể loại';
    else this.gSelectAll = text;
    this.filter();
  }

  filterLanguages(value: number, text: string)
  {
    this.languageId = value;
    if (value > this.lastLId) this.lSelectAll = 'Ngôn ngữ';
    else this.lSelectAll = text;
    this.filter();
  }
  filterStatuses(value: number, text: string)
  {
    this.statusId = value;
    if (value > this.lastSId) this.sSelectAll = 'Trạng thái';
    else this.sSelectAll = text;
    this.filter();
  }
  rerender() 
  {
    this.dtElement.dtInstance.then((dtInstance : DataTables.Api) => 
    {
      dtInstance.destroy();
      this.dtTrigger.next();
    });
  }
  initMovie(movie: Movie): any
  {
    let m: any = {
      id: movie.id,
      originalTitle: movie.originalTitle,
      title: movie.title,
      plot: movie.plot,
      directors: movie.directors,
      producers: movie.producers,
      releaseDate: this.datePipe.transform(movie.releaseDate,"yyyy-MM-dd"),
      runtime: movie.runtime,
      ageRating: movie.ageRating,
      poster: movie.poster,
      backdrop: movie.backdrop,
      trailer: movie.trailer,
      imdb: movie.imdb,
      languageId: movie.languageId,
      movieStatusId: movie.movieStatusId,
      genres: movie.genres,
      casts: movie.casts,
      accountId: movie.accountId,
      createdDate: movie.createdDate
    }
    return m;
  }
  openMovieModal(id: number)
  {
    let movie: MovieWithAvgRatings = this.filterMovies.find(m => m.movie.id == id);
    const modalRef = this.modalService.open(MovieModalComponent, {backdrop: 'static', keyboard: false});
    modalRef.componentInstance.name = 'Cập nhật phim';
    modalRef.componentInstance.movie = this.initMovie(movie.movie);

    modalRef.result.then(async (result: any) => {
      if (typeof(result) == 'object') 
      {
        movie.movie = result
        this.filter()
        this.toast.toastSuccess('Cập nhật phim thành công!')
      }
    }, (reason: any) => {})
  }

  openCastModal(id: number)
  {
    const modalRef = this.modalService.open(MovieCastModalComponent, {backdrop: 'static', keyboard: false} );
    modalRef.componentInstance.movieId = id;

    modalRef.result.then(async (result: any) => {
      if (result == 'Success') this.toast.toastSuccess('Cập nhật phim thành công!')
      else if (result == 'Error') this.toast.toastError('Cập nhật không thành công!')
    }, (reason: any) => {});

  }
  
  async deleteMovie(id: number)
  {
    let name: string = this.movies.find(m => m.movie.id == id).movie.title;
    var r = confirm(`Bạn có chắc muốn xóa phim '${name}' không?` );
    if (r)
    {
      try
      {
        let result = await this.http.delete(this.url + `/${id}`).toPromise()
        if (result) 
        {
          this.movies = this.movies.filter(m => m.movie.id != id)
          this.filter()
          this.toast.toastSuccess('Xóa phim thành công!')
        }
      } 
      catch(e) 
      {
        console.log(e)
        this.toast.toastError('Xóa phim không thành công')
      }
    }
  }

  async getRatings()
  {
    try
    {
      let lstRatings = await this.http.get<any[]>(this.url + "/AvgRatings").toPromise()
      this.movies.forEach(movie => {
        let rating = lstRatings.find(r => r.id == movie.movie.id)
        if (rating) movie.ratings = rating.ratings
      })
      this.filter()
    }
    catch(e) { console.log(e) }
  }
}
