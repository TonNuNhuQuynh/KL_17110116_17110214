import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ApiService } from 'app/api.service';

@Component({
  selector: 'app-news',
  templateUrl: './news.component.html',
  styleUrls: ['./news.component.css']
})
export class NewsComponent implements OnInit {

  constructor(private router: Router, private http: HttpClient, private apiService: ApiService, private route: ActivatedRoute) { }
  title: string = ''
  isLoaded: boolean = false
  isLoadedMore: boolean = false
  posts: any[] = []
  reviews: any[] = []
  total: number = 0
  movieId: number = 0

  async ngOnInit(): Promise<void> 
  {
    this.route.queryParams.subscribe(params => {
      this.movieId = Number(params["movieId"]) || 0;
      if (this.movieId == 0) this.router.navigate(['/not-found']);
    });

    await this.getPosts()
  }
  async getPosts()
  {
    let url = this.apiService.backendHost + `/api/Posts/Movie/${this.movieId}`
    try
    {
      let result = await this.http.get<any>(url).toPromise()
      this.posts = result.posts
      this.reviews = result.reviews
      this.total = result.total
    }
    catch(e) { console.log(e) }
    this.isLoaded = true
  }
  async loadMore()
  {
    this.isLoadedMore = true;
    let url = this.apiService.backendHost + `/api/Posts/Movie/${this.movieId}/${this.posts.length}`
    try 
    {
      let result = await this.http.get<any[]>(url).toPromise()
      result.forEach(element => { this.posts.push(element); });
    }
    catch(e) { console.log(e) }
    this.isLoadedMore = false;
  }
}
