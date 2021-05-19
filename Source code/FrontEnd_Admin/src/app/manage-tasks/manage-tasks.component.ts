import { HttpClient } from '@angular/common/http';
import { AfterViewInit, ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { DataTableDirective } from 'angular-datatables';
import { ApiService } from 'app/api.service';
import { AuthenticationService } from 'app/authentication/authentication.service';
import { RolesService } from 'app/manage-accounts/roles.service';
import { ToastService } from 'app/toast/toast.service';
import { Subject } from 'rxjs';
import { Task } from './model';
import { TaskModalComponent } from './task-modal/task-modal.component';
import { TaskService } from './task.service';

@Component({
  selector: 'app-manage-tasks',
  templateUrl: './manage-tasks.component.html',
  styleUrls: ['./manage-tasks.component.css']
})
export class ManageTasksComponent implements OnInit, OnDestroy, AfterViewInit {

  url: string = '';
  dtOptions: DataTables.Settings = {};
  dtTrigger: Subject<any> = new Subject();
  @ViewChild(DataTableDirective) dtElement: DataTableDirective;

  aSelectAll: string = 'Admin';
  sSelectAll: string = 'Trạng thái';
  adminId: number = 0;
  statusId: number = -1;

  tasks: Task[] = [];
  filterTasks: Task[] = [];

  isSuperAdmin: boolean = false;
  taskId: number = 0
  notificationId: number = 0

  constructor(private router: Router, private route: ActivatedRoute, public auth: AuthenticationService, private http: HttpClient, private toast: ToastService, private apiService: ApiService, private chRef : ChangeDetectorRef, private modalService: NgbModal) 
  { 
    router.routeReuseStrategy.shouldReuseRoute = function () { return false; };
  }
  
  ngOnDestroy(): void {
    this.dtTrigger.unsubscribe();
  }

  async ngOnInit(): Promise<void> 
  {
    this.route.queryParams.subscribe(params => {
      this.taskId = Number(params["id"]) || 0;
      this.notificationId = Number(params["view"]) || 0;
    }); 

    this.dtOptions = {
      pagingType: 'full_numbers',
      lengthMenu: [10, 15, 20, 30, 40],
      autoWidth: true,
      columnDefs: [ { "orderable": false, "targets": 0 }, 
                    { "visible": false, "targets": 5 },
                    { "width": '30%', "targets": 1 }
                  ],
      order: [[5, 'desc']]
    };
    this.url = this.apiService.backendHost + '/api/Tasks';
    
    if (this.auth.currentAccountValue.roleName == RolesService.superAdmin) this.isSuperAdmin = true;
    await this.getTasks();
    this.checkStatus();
    this.filterTasks = this.tasks;
    this.chRef.detectChanges();
    this.dtTrigger.next();
  }
  async getTasks()
  {
    this.tasks = await this.http.get<Task[]>(this.url).toPromise();
  }
  checkStatus()
  {
    this.tasks.forEach(t => {
      if (t.status == TaskService.processingT)  //Task đang thực hiện
      {
        var release = new Date(t.deadline);
        var now = new Date();
        if (release.getTime() > now.getTime()) 
        {
          var hDiff = (release.getTime() - now.getTime()) / 3600000;
          if (hDiff <= 2 && hDiff > 0) t.status = TaskService.timeUpT; // Sắp tới deadline
        }
        else t.status = TaskService.overdueT;                           // Đã qua deadline
      }
    });
  }

  rerender() 
  {
    this.dtElement.dtInstance.then((dtInstance : DataTables.Api) => 
    {
      dtInstance.destroy();
      this.dtTrigger.next();
    });
  }
  filterAdmins(value: number, text: string)
  {
    this.adminId = value;
    if (value == 0) this.aSelectAll = 'Admin';
    else this.aSelectAll = text;
    this.filter();
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
    let temp: Task[];
    temp = this.adminId == 1? this.tasks.filter(m => m.creatorId == this.auth.currentAccountValue.id): this.tasks;
    temp = this.statusId > -1? temp.filter(m => m.status == this.statusId): temp;
    this.filterTasks = temp;  
    this.rerender();
  }
  async deleteTask(id: number)
  {
    let name: string = this.filterTasks.find(m => m.id == id).title;
    var r = confirm(`Bạn có chắc muốn xóa task '${name}' không?` );
    if (r)
    {
      try
      {
        await this.http.delete(this.url + `/${id}`).toPromise();
        this.tasks = this.tasks.filter(m => m.id != id);
        this.filter();
        this.toast.toastSuccess('Xóa task thành công!');
      } 
      catch(e) {
        console.log(e);
        this.toast.toastError('Xóa task không thành công');
      }
    }
  }
  viewTask(id: number)
  {
    const modalRef = this.modalService.open(TaskModalComponent, {backdrop: 'static', keyboard: false});
    modalRef.componentInstance.task.id = id;
    modalRef.componentInstance.name = 'Chi tiết task';

    modalRef.result.then(async (result: any) => 
    {
      if (typeof(result) == 'object') 
      {
        this.toast.toastSuccess('Cập nhật task thành công!')
        let index = this.tasks.findIndex(t => t.id == id)
        this.tasks[index] = result
        this.checkStatus();
        this.filter()
      }
      else if (result == 'Failed') this.toast.toastError('Có thể task đã bị xóa, hãy reload page!');
    }, (reason: any) => {});

  }
  addTask()
  {
    const modalRef = this.modalService.open(TaskModalComponent, {backdrop: 'static', keyboard: false});
    modalRef.componentInstance.task.id = 0;
    modalRef.componentInstance.task.creatorId = this.auth.currentAccountValue.id;
    modalRef.componentInstance.name = 'Tạo task';

    modalRef.result.then(async (result: any) => {
      if (typeof(result) == 'object') 
      {
        this.toast.toastSuccess('Thêm task thành công!')
        this.tasks.unshift(result)
        this.checkStatus();
        this.filter()
      }
      else if (result == 'Failed') this.toast.toastError('Thêm task không thành công!');
    }, (reason: any) => {});
  }
  
  async ngAfterViewInit(): Promise<void> {
    if (this.taskId != 0) this.viewTask(this.taskId)
    if (this.notificationId != 0) await this.viewNotification();
  }

  async viewNotification()
  {
    let url = this.apiService.backendHost + `/api/Notifications/View/${this.notificationId}`;
    await this.http.get(url).toPromise();
  }
}
