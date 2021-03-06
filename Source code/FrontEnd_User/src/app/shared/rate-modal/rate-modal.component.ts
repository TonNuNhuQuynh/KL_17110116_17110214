import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ApiService } from 'app/api.service';
import { AuthenticationService } from 'app/authentication/authentication.service';
import { MovieWithAvgRatings } from 'app/movie-list/model';
import { Movie } from '../../movie-details/model';
import { Review } from './model';

@Component({
  selector: 'app-rate-modal',
  templateUrl: './rate-modal.component.html',
  styleUrls: ['./rate-modal.component.css']
})
export class RateModalComponent implements OnInit {

  constructor(public activeModal: NgbActiveModal, private http: HttpClient, private apiService: ApiService, public auth: AuthenticationService) 
  { }

  @Input() movie: Movie;
  @Input() rated: boolean;

  review: Review;
  invalid: boolean = false;
  isLoaded: boolean = false;

  async ngOnInit(): Promise<void> 
  {
    this.review =  
    {
      id: 0,
      content: '',
      spoilers: false,
      ratings: 0,
      createdDate: new Date(),
      movieId: this.movie.id,
      accountId: this.auth.currentAccountValue.id,
      movie: null
    }
    if (this.rated) await this.getReview();
  }
  async getReview()
  {
    let url = this.apiService.backendHost + `/api/Reviews/Details?movieId=${this.movie.id}&accountId=${this.auth.currentAccountValue.id}`;
    try 
    {
      let result = await this.http.get<Review>(url).toPromise();
      if (result) 
      {
        this.review = result;
        this.review.content = this.replaceBrTag(this.review.content)
      }
    }
    catch(e) { console.log(e) }
  }

  closeModal(result: any)
  {
    this.activeModal.close(result);
  }

  async saveReview()
  {
    if (this.review.ratings == 0) this.invalid = true;
    else 
    {
      this.isLoaded = true;
      this.review.content = this.replaceLineBreak(this.review.content)
      let url = this.apiService.backendHost + '/api/Reviews';
      if (!this.rated)
      {
        try 
        {
          let result = await this.http.post<MovieWithAvgRatings>(url, this.review).toPromise();
          this.auth.updateRate(this.review.movieId, true);
          this.closeModal(result);
        }
        catch(e) { this.closeModal('Failed'); }
      }
      else 
      {
        try 
        {
          let headers: any = new HttpHeaders();
          headers.append('Content-Type', 'application/json');
          let result = await this.http.put<MovieWithAvgRatings>(url + `/${this.review.id}`, this.review, headers).toPromise();
          this.closeModal(result);
        }
        catch(e) { this.closeModal('Failed'); }
      }
      this.isLoaded = false;
    }
  }
  async deleteReview()
  {
    var r = confirm('B???n c?? mu???n x??a b??i ????nh gi?? n??y?');
    if (r)
    {
      this.isLoaded = true;
      let url = this.apiService.backendHost + `/api/Reviews/${this.review.id}`;
      try 
      {
        let result = await this.http.delete(url).toPromise();
        this.auth.updateRate(this.movie.id, false);
        this.closeModal(result);
      }
      catch(e) { this.closeModal('Delete Failed'); }
      this.isLoaded = false;
    }
  }
  replaceLineBreak(value: string): string 
  {
    return value.replace(/\n/g, '<br/>');
  }
  replaceBrTag(value: string): string 
  {
    return value.replace('<br/>', '\n');
  }
}
