import { HttpClient } from '@angular/common/http';
import { AfterViewInit, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from 'app/api.service';

@Component({
  selector: 'app-news-list',
  templateUrl: './news-list.component.html',
  styleUrls: ['./news-list.component.css']
})
export class NewsListComponent implements OnInit, AfterViewInit {

  constructor(private router: Router, private route: ActivatedRoute, private apiService: ApiService, private http: HttpClient) 
  { 
    this.router.routeReuseStrategy.shouldReuseRoute = function () { return false; };
  }

  type: number = 0
  theme: number = 0
  tag: string = null
  posts: any[] = []
  total: number = 0
  title: any = {id: 0, name: '', description: ''}
  types: any[] = []
  reviews: any[] = []

  isLoaded: boolean = false
  isLoadedMore: boolean = false

  async ngOnInit(): Promise<void> 
  {
    this.type = Number(this.route.snapshot.paramMap.get('type')) || 0
    this.theme = Number(this.route.snapshot.paramMap.get('theme')) || 0
    this.tag = this.route.snapshot.paramMap.get('tag') || null
    
    if (this.type == 0 && this.theme == 0 && !this.tag) this.router.navigate(['/not-found'])
    else await this.initPage()
  }
  async initPage()
  {
    let url = this.apiService.backendHost + '/api/Posts/GetPostsByCategory'
    if (this.type != 0) url += `?type=${this.type}`
    else if (this.theme != 0) url += `?theme=${this.theme}`
    else if (this.tag != null) url += `?tag=${this.tag}`
    
    try
    {
      let result = await this.http.get<any>(url).toPromise()
      this.posts = result.posts
      this.title = result.title
      this.total = result.total
    }
    catch(e) { this.router.navigate(['/not-found']) }
    this.isLoaded = true
  }
  async getReferences()
  {
    if (this.type != 0) 
    {  
      let result = await this.http.get<any>(this.apiService.backendHost + '/api/Posts/GetCategories').toPromise()
      this.types = result.types
    }
    else if (this.theme != 0) this.reviews = await this.http.get<any[]>(this.apiService.backendHost + `/api/Posts/GetReviewsOfTheme/${this.theme}`).toPromise()
  }
  async ngAfterViewInit(): Promise<void> 
  {
    await this.getReferences()
  }
  async loadMore()
  {
    this.isLoadedMore = true;
    let url = this.apiService.backendHost + '/api/Posts';
    if (this.type != 0) url += `?type=${this.type}`
    else if (this.theme != 0) url += `?theme=${this.theme}`
    else if (this.tag != null) url += `?tag=${this.tag}`

    try 
    {
      let result = await this.http.get<any[]>(url + `&start=${this.posts.length}`).toPromise()
      result.forEach(element => { this.posts.push(element); });
    }
    catch(e) { console.log(e) }
    this.isLoadedMore = false;
  }
}
