import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { DataTableDirective } from 'angular-datatables';
import { ApiService } from 'app/api.service';
import { AuthenticationService } from 'app/authentication/authentication.service';
import { Subject } from 'rxjs';
import { Task } from './model';
import { TaskService } from './task.service';

@Component({
  selector: 'app-task-list',
  templateUrl: './task-list.component.html',
  styleUrls: ['./task-list.component.scss']
})
export class TaskListComponent implements OnInit, OnDestroy {

  constructor(private apiService: ApiService, public auth: AuthenticationService, private http: HttpClient, private chRef : ChangeDetectorRef) { }

  ngOnDestroy(): void 
  {
    this.dtTrigger.unsubscribe();
  }

  dtOptions: DataTables.Settings = {};
  dtTrigger: Subject<any> = new Subject();
  @ViewChild(DataTableDirective) dtElement: DataTableDirective;
  
  sSelectAll: string = 'Trạng thái';
  statusId: number = -1;
  tasks: Task[] = [];
  filterTasks: Task[] = [];

  async ngOnInit(): Promise<void> 
  {
    this.dtOptions = {
      pagingType: 'full_numbers',
      lengthMenu: [10, 15, 20, 30, 40],
      autoWidth: true,
      columnDefs: [{ "orderable": false, "targets": 0 }, {"visible": false, "targets": 4}, { "width": '40%', "targets": 1 }],
      order: [[4, 'desc']]
    };
    await this.getTasks();
    this.checkStatus();
    this.filterTasks = this.tasks;
    this.chRef.detectChanges();
    this.dtTrigger.next();
  }

  async getTasks()
  {
    let url = this.apiService.backendHost + `/api/Tasks/User/${this.auth.currentAccountValue.id}`;
    this.tasks = await this.http.get<Task[]>(url).toPromise();
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
  
  filterStatuses(value: number, text: string)
  {
    this.statusId = value;
    if (value == -1) this.sSelectAll = 'Trạng thái';
    else this.sSelectAll = text;
    this.filter();
  }
  filter()
  {
    this.filterTasks = this.statusId > -1? this.tasks.filter(m => m.status == this.statusId): this.tasks;  
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
}
