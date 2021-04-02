import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { DataTableDirective } from 'angular-datatables';
import { ApiService } from 'app/api.service';
import { AuthenticationService } from 'app/authentication/authentication.service';
import { RolesService } from 'app/manage-accounts/roles.service';
import { ToastService } from 'app/toast/toast.service';
import { Subject } from 'rxjs/Subject';
import { Post } from './model';
import { PostServive } from './post.service';

@Component({
  selector: 'app-manage-posts',
  templateUrl: './manage-posts.component.html',
  styleUrls: ['./manage-posts.component.css']
})
export class ManagePostsComponent implements OnInit, OnDestroy {

  constructor(private router: Router, private toast: ToastService, private apiService: ApiService, public auth: AuthenticationService, private http: HttpClient, private chRef : ChangeDetectorRef) { }

  dtOptions: DataTables.Settings = {};
  dtTrigger: Subject<any> = new Subject();
  @ViewChild(DataTableDirective) dtElement: DataTableDirective;

  sSelectAll: string = 'Trạng thái';
  statusId: number = -1;
  posts: Post[] = [];
  filterPosts: Post[] = [];
  isSuperAdmin: boolean = false

  async ngOnInit(): Promise<void> 
  {
    this.dtOptions = {
      pagingType: 'full_numbers',
      lengthMenu: [10, 15, 20, 30, 40],
      autoWidth: true,
      columnDefs: [ { "orderable": false, "targets": 0 }, 
                    {"visible": false, "targets": 4},
                    { "width": '40%', "targets": 1 }
                  ],
      order: [[4, 'desc']]
    };
    await this.getPosts();
    this.filterPosts = this.posts;
    this.isSuperAdmin = this.auth.currentAccountValue.roleName == RolesService.superAdmin? true: false
    this.chRef.detectChanges();
    this.dtTrigger.next();
  }

  async getPosts() 
  {
    let url = this.apiService.backendHost + '/api/Posts';
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
  async deletePost(id: number)
  {
    let post = this.filterPosts.find(m => m.id == id)
    var r = confirm(`Bạn có chắc muốn gỡ bài viết '${post.title}' khỏi trang không?` );
    if (r)
    {
      try
      {
        await this.http.delete(this.apiService.backendHost + `/api/Posts/${id}`).toPromise()
        post.status = PostServive.deletedP
        this.filter()
        this.toast.toastSuccess('Xóa bài viết thành công!')
      } 
      catch(e) {
        console.log(e)
        this.toast.toastError('Xóa bài viết không thành công')
      }
    }
  }
  // reviewPost(id: number, isDeleted: boolean)
  // {
  //   if (!isDeleted) this.router.navigate(['/review-post'], {queryParams: {id: id}})
  //   else this.toast.toastInfo('Bạn không thể xem bài viết vì nó đã bị gỡ khỏi trang')
  // }
}
