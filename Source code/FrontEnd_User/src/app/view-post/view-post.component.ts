import { HttpClient } from '@angular/common/http';
import { AfterViewChecked, Component, OnInit } from '@angular/core';
import { DomSanitizer, Meta, SafeHtml, Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from 'app/api.service';
import { Post } from 'app/writer/post-list/model';
declare var iframely: any;
declare var FB: any;

@Component({
  selector: 'app-view-post',
  templateUrl: './view-post.component.html',
  styleUrls: ['./view-post.component.css']
})
export class ViewPostComponent implements OnInit, AfterViewChecked {

  constructor(private titleService: Title, private metaService: Meta, public sanitizer: DomSanitizer, private router: Router, private route: ActivatedRoute, private apiService: ApiService, private http: HttpClient) 
  {
    this.router.routeReuseStrategy.shouldReuseRoute = function () { return false; };
    this.shareUrl = window.location.href
  }
  
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
    accountId: 0,
    isDeleted: false,
    publishedDate: null,
    createdDate: new Date(),
    task: {creatorId: 0, id: 0},
    feedbacks: []
  }
  postTags: string[] = []
  similarPosts: any[] = []

  isChecked: boolean = false

  shareUrl: string = ''
  safeContent: SafeHtml

  async ngOnInit(): Promise<void> 
  {
    this.post.id = Number(this.route.snapshot.paramMap.get('id')) || 0
    if (this.post.id != 0) await this.getPost()
    else this.router.navigate(['/not-found'])

    this.titleService.setTitle(this.post.title)
    this.metaService.addTags([
      {name: 'description', content: this.post.summary},
      {name: 'image', content: this.post.cover}
    ]);

    this.safeContent = this.sanitizer.bypassSecurityTrustHtml(this.post.content);

    this.postTags = this.post.keywords.split('/')
    FB.XFBML.parse();
    await this.getSimilarPosts()
  }
  getBackdrop()
  {
    return (this.post.cover != '' && this.post.cover != null? `background: linear-gradient(rgb(0, 0, 0, 0.25), rgb(0, 0, 0, 0.80)), url('${this.post.cover}'); background-size: 100% 100%;`: "background-color: #12263f");
  }

  async getPost()
  {
    let url = this.apiService.backendHost + `/api/Posts/View/${this.post.id}`;
    try {
      this.post = await this.http.get<Post>(url).toPromise();
    }
    catch(e) { console.log(e); this.router.navigate(['/not-found']) }
  }
  async getSimilarPosts()
  {
    let url = this.apiService.backendHost + `/api/Posts/View/GetSimilar/${this.post.id}`;
    try {
      this.similarPosts = await this.http.get<Post[]>(url).toPromise();
    }
    catch(e) { console.log(e) }
  }
  ngAfterViewChecked(): void 
  {
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

}
