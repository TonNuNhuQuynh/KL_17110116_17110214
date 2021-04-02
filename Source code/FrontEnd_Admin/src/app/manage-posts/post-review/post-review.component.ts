import { HttpClient } from '@angular/common/http';
import { AfterViewChecked, AfterViewInit, Component, OnInit} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Router, ActivatedRoute } from '@angular/router';
import { ApiService } from 'app/api.service';
import { AuthenticationService } from 'app/authentication/authentication.service';
import { ToastService } from 'app/toast/toast.service';
import { Post } from '../model';
import { PostServive } from '../post.service';
declare var iframely: any;

@Component({
  selector: 'app-post-review',
  templateUrl: './post-review.component.html',
  styleUrls: ['./post-review.component.css'],
})
export class PostReviewComponent implements OnInit, AfterViewInit, AfterViewChecked {

  constructor(private toast: ToastService, public sanitizer: DomSanitizer, private router: Router, private apiService: ApiService, private route: ActivatedRoute, private http: HttpClient, private auth: AuthenticationService) 
  {
    router.routeReuseStrategy.shouldReuseRoute = function () { return false; };
    
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
  async ngAfterViewInit(): Promise<void> 
  {
    // window.addEventListener('scroll', () => {
    //   if (!this.isChecked)
    //   {
    //     let elements = document.querySelectorAll('oembed[url]')
    //     if (elements.length > 0)
    //     {
    //       this.isChecked = true
    //       elements.forEach( (element: HTMLElement) => {
    //         iframely.load( element, element.attributes['url'].value );
    //       });        
    //     }
    //   }
    // })
    if (this.notificationId != 0) await this.viewNotification();

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
    accountId: this.auth.currentAccountValue.id,
    isDeleted: false,
    publishedDate: null,
    createdDate: new Date(),
    task: {creatorId: 0, id: 0},
    feedbacks: []
  };
  feedback: string = null;
  postTags: string[] = [];
  safeContent: SafeHtml

  notificationId: number = 0
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
  getContent(): SafeHtml
  {
    return this.sanitizer.bypassSecurityTrustHtml(this.post.content);
  }
  async postFeedback()
  {
    let url = this.apiService.backendHost + '/api/Feedbacks';
    try 
    {
      let feedback = {postId: this.post.id, accountId: this.auth.currentAccountValue.id, content: this.feedback, createdDate: new Date()}
      let newFeedback = await this.http.post<any>(url, {feedback: feedback, receiverId: this.post.accountId}).toPromise()
      this.toast.toastSuccess("Đăng feedback thành công!")
      this.post.feedbacks.push({content: feedback.content, createdDate: newFeedback.createdDate, username: this.auth.currentAccountValue.username, image: this.auth.currentAccountValue.user.image})
      this.feedback = ''
    }
    catch(e) { console.log(e); this.toast.toastError("Đăng feedback không thành công!")}
  }
  async publish()
  {
    var r = confirm(`Bạn có chắc muốn xuất bản bài viết này không?` );
    if (r)
    {
      try
      {
        let date = await this.http.get<string>(this.apiService.backendHost + `/api/Posts/Publish/${this.post.id}/${this.post.task.id}`).toPromise()
        this.post.publishedDate = new Date(date)
        this.post.status = PostServive.publishedP
        this.toast.toastSuccess('Xuất bản bài viết thành công!')
      } 
      catch(e) {
        console.log(e)
        this.toast.toastError('Xuất bản bài viết không thành công')
      }
    }
  }
  async viewNotification()
  {
    let url = this.apiService.backendHost + `/api/Notifications/View/${this.notificationId}`;
    await this.http.get(url).toPromise();
  }
  openMovie()
  {
    window.open(this.apiService.frontEndHost_User + `/movie-details?movieId=${this.post.movieId}`, '_blank')
  }
}
