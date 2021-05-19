import { AfterViewInit, Component, OnInit } from '@angular/core';
import { AuthenticationService } from 'app/authentication/authentication.service';
import { Post } from '../post-list/model';
import * as ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import { debounceTime, finalize } from 'rxjs/operators';
import { distinctUntilChanged } from 'rxjs/operators';
import { filter, map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { ToastService } from 'app/toast/toast.service';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ApiService } from 'app/api.service';
import { AngularFireStorage } from '@angular/fire/storage';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { PickTaskComponent } from '../pick-task/pick-task.component';
import { PostServive } from '../post-list/post.service';

type Movie = {id: number, title: string};

@Component({
  selector: 'app-post-details',
  templateUrl: './post-details.component.html',
  styleUrls: ['./post-details.component.scss']
})
export class PostDetailsComponent implements OnInit,  AfterViewInit {

  constructor(private modalService: NgbModal, private storage: AngularFireStorage, private apiService: ApiService, private toast: ToastService, private route: ActivatedRoute, private http: HttpClient, private auth: AuthenticationService) { }
  
  name: string = 'Tạo bài viết'

  post: Post = {
    id: 0,
    title: null,
    summary: null,
    cover: null,
    content: '',
    postType: null,
    postTypeId: 0,
    postTheme: null,
    postThemeId: null,
    spoilers: false,
    movie: null,
    movieId: null,
    keywords: null,
    status: 0,
    account: null,
    accountId: this.auth.currentAccountValue.id,
    isDeleted: false,
    publishedDate: null,
    createdDate: new Date(),
    task: null,
    feedbacks: null
  };
  invalidContent: boolean = false
  invalidTitle: boolean = false
  invalidSummary: boolean = false
  invalidFile: boolean = false
  coverImg: File;
  relatedMovie: Movie
  isError: boolean = false
  isLoaded: boolean = true
  oldUrl: string = ''
  isUpdated: boolean = false

  types: any[] = [];
  themes: any[] = [];
  movies: Movie[] = [];
 
  public Editor = ClassicEditor
  
  formatter = (movie: Movie) => movie.title;
  notificationId: number = 0

  async ngOnInit(): Promise<void> 
  {
    this.route.queryParams.subscribe(params => {
      this.post.id = Number(params["id"]) || 0;
      this.notificationId = Number(params["noti"]) || 0;
    }); 
    await this.getSettings();
    if (this.post.id != 0)
    {
      this.name = 'Chi tiết bài viết'
      await this.getPost()
      this.invalidFile = false
    }
    this.oldUrl = this.post.cover

    var _this = this
    $(".custom-file-input").on("change", function() {
      _this.coverImg = $(this).prop('files')[0]
      _this.isUpdated = true
      var fileName = $(this).val().toString().split("\\").pop();
      $(this).siblings(".custom-file-label").addClass("selected").html(fileName);
      var mime = fileName.split(".")[1]
      if (mime != 'png' && mime != 'jpg' && mime != 'jpeg') _this.invalidFile = true
      else _this.invalidFile = false
    });

  }
  onFocus()
  {
    if (this.post.content == null) this.invalidContent = true
    else this.invalidContent = false
  }
  search = (text$: Observable<string>) => text$.pipe(
    debounceTime(200),
    distinctUntilChanged(),
    filter(term => term.length >= 2),
    map(term => this.movies.filter(state => new RegExp(term, 'mi').test(state.title)).slice(0, 10))
  )
  titleCount(event: string)
  {
    var s = event && event != '' ? event.split(/\s+/) : null;
    let count = s ? s.length : 0;
    if (count <= 5 || count > 60) this.invalidTitle = true;
    else this.invalidTitle = false
  }
  summaryCount(event: string)
  {
    var s = event && event != '' ? event.split(/\s+/) : null;
    let count = s ? s.length : 0;
    if (count <= 5 || count > 70) this.invalidSummary = true;
    else this.invalidSummary = false
  }
  async getSettings()
  {
    let url = this.apiService.backendHost + `/api/Posts/Settings`;
    let result = await this.http.get<any>(url).toPromise();
    this.types = result.types
    this.themes = result.themes
    this.movies = result.movies
  }
  async getPost()
  {
    let url = this.apiService.backendHost + `/api/Posts/${this.post.id}`;
    try 
    {
      this.post = await this.http.get<Post>(url).toPromise();
      if (this.post.movieId != null) this.relatedMovie = this.movies.find(m => m.id == this.post.movieId)
    }
    catch(e) { console.log(e); this.isError = true }
  }
  uploadImage() {
    return new Promise<string>((resolve) => {
      let title = this.post.title.replace(/[&\/\\#,+()$~%.'":*?<>{}]/g, '');
      const filePath = `post-covers/${this.cleanAccents(title).join('-')}.${this.coverImg.name.split('.')[1]}`;
      const fileRef = this.storage.ref(filePath);
      const task = this.storage.upload(filePath, this.coverImg);
      task.snapshotChanges().pipe(
        finalize(() => {
          let downloadURL = fileRef.getDownloadURL();
          downloadURL.subscribe(imgUrl => {
            if (imgUrl) resolve(imgUrl)
          });
        })
      ).subscribe();
    });
  }
  
  async savePost()
  {
    this.isLoaded = false
    if (this.relatedMovie != null) this.post.movieId = this.relatedMovie.id
    if (this.post.cover != null && this.isUpdated) await this.deleteImage(this.post.cover)
    if (this.coverImg != null ) 
    {
      let imgUrl = await this.uploadImage()
      this.oldUrl = this.post.cover
      this.post.cover = imgUrl
    }

    let url = this.apiService.backendHost + `/api/Posts${this.post.id == 0? '': `/${this.post.id}`}`;
    try
    {
      if (this.post.id == 0) 
      {
        let result = await this.http.post<number>(url, this.post).toPromise();
        this.post.id = Number(result)
        this.toast.toastSuccess('Tạo bài viết thành công!')
      }
      else
      {
        let r = true
        if (this.post.status == PostServive.sentP) r = confirm('Bài viết đã được gửi cho admin, khi update sẽ được báo về cho admin. Bạn vẫn muốn update bài viết?')
        if (r)
        {
          await this.http.put(url, this.post).toPromise();
          this.toast.toastSuccess('Lưu bài viết thành công!')
        }
      }
      this.isUpdated = false
      this.name = 'Chi tiết bài viết'
    }
    catch(e) {
      console.log(e) 
      this.toast.toastError('Lưu bài viết không thành công! Hãy F5 lại trang')
      await this.deleteImage(this.post.cover)
      this.post.cover = this.oldUrl
      this.oldUrl = null
    }
    this.isLoaded = true
  }
  sendPost()
  {
    const modalRef = this.modalService.open(PickTaskComponent, {backdrop: 'static', keyboard: false});
    modalRef.componentInstance.postId = this.post.id;
    modalRef.result.then(async (result: any) => {
      if (typeof(result) == 'object') 
      {
        this.toast.toastSuccess('Gửi bài viết thành công!')
        this.post.status = PostServive.sentP
        this.post.task = result
      }
      else if (result == 'Failed') this.toast.toastError('Xảy ra lỗi! Xin thử lại')
    }, () => {})
  }
  reviewPost()
  {
    window.open(this.apiService.frontEndHost_User + `/review?id=${this.post.id}`, '_blank')
  }
  cleanAccents = (str: string): string[] => {
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
    str = str.replace(/đ/g, "d");
    str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
    str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
    str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
    str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
    str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
    str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
    str = str.replace(/Đ/g, "D");
    str = str.replace(/\u0300|\u0301|\u0303|\u0309|\u0323/g, "");  
    str = str.replace(/\u02C6|\u0306|\u031B/g, ""); 
    return str.split(' ');
  }
  async deleteImage(url: string)
  {
    try
    {
      await this.storage.refFromURL(url).delete().toPromise();
    } catch(e) {console.log(e)}
  }
  async viewNotification()
  {
    let url = this.apiService.backendHost + `/api/Notifications/View/${this.notificationId}`;
    await this.http.get(url).toPromise();
  }
  async ngAfterViewInit(): Promise<void> {
    if (this.notificationId != 0) await this.viewNotification();
  }
}
