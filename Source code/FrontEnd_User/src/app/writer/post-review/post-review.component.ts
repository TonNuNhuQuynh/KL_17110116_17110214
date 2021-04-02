import { HttpClient } from '@angular/common/http';
import { AfterViewChecked, AfterViewInit, Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from 'app/api.service';
import { AuthenticationService } from 'app/authentication/authentication.service';
import { Post } from '../post-list/model';
declare var iframely: any;

@Component({
  selector: 'app-post-review',
  templateUrl: './post-review.component.html',
  styleUrls: ['./post-review.component.css']
})
export class PostReviewComponent implements OnInit, AfterViewChecked, AfterViewInit {

  constructor(public sanitizer: DomSanitizer, private router: Router, private apiService: ApiService, private route: ActivatedRoute, private http: HttpClient, private auth: AuthenticationService) { }

  post: Post = {
    id: 0,
    title: null,
    summary: null,
    cover: null,
    content: null,
    postTypeId: 0,
    postType: {id: 0, name: ''},
    postThemeId: null,
    postTheme: {id: 0, name: ''},
    spoilers: false,
    movie: null,
    movieId: null,
    keywords: null,
    status: 0,
    account: {userName: ''},
    accountId: this.auth.currentAccountValue.id,
    isDeleted: false,
    publishedDate: null,
    createdDate: new Date(),
    task: {creatorId: 0, id: 0},
    feedbacks: []
  };
  postTags: string[] = [];
  notificationId: number = 0
  safeContent: SafeHtml
  isChecked = false
  
  async ngOnInit(): Promise<void> 
  {
    this.route.queryParams.subscribe(params => {
      this.post.id = Number(params["id"]) || 0;
      this.notificationId = Number(params["view"]) || 0;
    }); 
    if (this.post.id == 0) this.router.navigate(['/not-found'])
    else await this.getPost();
    this.safeContent = this.sanitizer.bypassSecurityTrustHtml(this.post.content);
    this.postTags = this.post.keywords.split('/')
    await this.getFeedbacks()
  }

  getBackdrop()
  {
    return (this.post.cover != '' && this.post.cover != null? `background: linear-gradient(rgb(0, 0, 0, 0.25), rgb(0, 0, 0, 0.80)), url('${this.post.cover}'); background-size: 100% 100%;`: "background-color: #12263f");
  }

  async getPost()
  {
    let url = this.apiService.backendHost + `/api/Posts/Review/${this.post.id}`;
    try 
    {
      this.post = await this.http.get<Post>(url).toPromise();
    }
    catch(e) { console.log(e); this.router.navigate(['/not-found']) }
  }

  async getFeedbacks()
  {
    let url = this.apiService.backendHost + `/api/Feedbacks/${this.post.id}`;
    try 
    {
      this.post.feedbacks = await this.http.get<any[]>(url).toPromise();
    }
    catch(e) { console.log(e);}
  }

  async ngAfterViewChecked(): Promise<void> {
  
    if (!this.isChecked)
    {
      let elements = document.querySelectorAll('oembed[url]')
      if (elements.length > 0)
      {
        this.isChecked = true
        elements.forEach( (element: HTMLElement) => {
          iframely.load( element, element.attributes['url'].value );
        });        
      }
    }    
    
  }

  async ngAfterViewInit(): Promise<void> {
    if (this.notificationId != 0) await this.viewNotification();
  }

  async viewNotification()
  {
    let url = this.apiService.backendHost + `/api/Notifications/View/${this.notificationId}`;
    await this.http.get(url).toPromise();
  }
  
}
