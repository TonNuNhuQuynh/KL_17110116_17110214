import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { AngularFireStorage } from '@angular/fire/storage';
import { DataTableDirective } from 'angular-datatables';
import { ApiService } from 'app/api.service';
import { AuthenticationService } from 'app/authentication/authentication.service';
import { ToastService } from 'app/toast/toast.service';
import { Subject } from 'rxjs/Subject';
import { Post } from './model';
import { PostServive } from './post.service';


@Component({
  selector: 'app-post-list',
  templateUrl: './post-list.component.html',
  styleUrls: ['./post-list.component.scss']
})
export class PostListComponent implements OnInit, OnDestroy {

  constructor(private storage: AngularFireStorage, private toast: ToastService, private apiService: ApiService, public auth: AuthenticationService, private http: HttpClient, private chRef : ChangeDetectorRef) { }

  dtOptions: DataTables.Settings = {};
  dtTrigger: Subject<any> = new Subject();
  @ViewChild(DataTableDirective) dtElement: DataTableDirective;
  
  sSelectAll: string = 'Trạng thái';
  statusId: number = -1;
  posts: Post[] = [];
  filterPosts: Post[] = [];
  showDelete: boolean = false
  
  async ngOnInit(): Promise<void> 
  {
    await this.getPosts();
    this.filterPosts = this.posts;
    this.showDelete = this.filterPosts.find(p => p.status == PostServive.processingP)? true: false

    this.dtOptions = {
      pagingType: 'full_numbers',
      lengthMenu: [10, 15, 20, 30, 40],
      autoWidth: true,
      columnDefs: [ { "orderable": false, "targets": 0 }, 
                    {"visible": false, "targets": 4},
                    { "width": this.showDelete? '30%': '40%', "targets": 1 }
                  ],
      order: [[4, 'desc']]
    };
    
    this.chRef.detectChanges();
    this.dtTrigger.next();
  }
  
  async getPosts() 
  {
    let url = this.apiService.backendHost + `/api/Posts/User/${this.auth.currentAccountValue.id}`;
    this.posts = await this.http.get<Post[]>(url).toPromise();
  }
  filterStatuses(value: number, text: string)
  {
    this.statusId = value;
    if (value == -1) this.sSelectAll = 'Trạng thái';
    else this.sSelectAll = text;
    this.filter();
  }
  filter()
  {
    if (this.statusId == -1) this.filterPosts = this.posts
    else if (this.statusId == PostServive.deletedP) this.filterPosts = this.posts.filter(m => m.isDeleted);
    else this.filterPosts = this.posts.filter(m => m.status == this.statusId)
    this.rerender();
  }
  rerender() 
  {
    this.dtElement.dtInstance.then((dtInstance : DataTables.Api) => 
    {
      dtInstance.destroy();
      this.dtTrigger.next();
    });
  }
  ngOnDestroy(): void {
    this.dtTrigger.unsubscribe();
  }
  async deletePost(id: number, url: string)
  {
    let name: string = this.filterPosts.find(m => m.id == id).title;
    var r = confirm(`Bạn có chắc muốn xóa bài viết '${name}' không?` );
    if (r)
    {
      try
      {
        await this.http.delete(this.apiService.backendHost + `/api/Posts/Writer/${id}`).toPromise()
        this.posts = this.posts.filter(m => m.id != id)
        this.filter()
        this.toast.toastSuccess('Xóa bài viết thành công!')
        await this.deleteImage(url)
      } 
      catch(e) { console.log(e); this.toast.toastError('Xóa bài viết không thành công'); }
    }
  }
  async deleteImage(url: string)
  {
    try
    {
      await this.storage.refFromURL(url).delete().toPromise();
    } catch(e) {console.log(e)}
  }
}
