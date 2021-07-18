import { HttpClient } from '@angular/common/http';
import { AfterViewInit, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from 'app/api.service';
import { AuthenticationService } from 'app/authentication/authentication.service';
import { ToastService } from 'app/toast/toast.service';
import { Subscription } from 'rxjs';
import { NotificationService } from '../notification.service';
import { Task } from '../task-list/model';
import { TaskService } from '../task-list/task.service';

@Component({
  selector: 'app-task-details',
  templateUrl: './task-details.component.html',
  styleUrls: ['./task-details.component.scss']
})
export class TaskDetailsComponent implements OnInit, AfterViewInit {

  constructor(private notify: NotificationService, private toast: ToastService, private route: ActivatedRoute, private http: HttpClient, private apiService: ApiService, public auth: AuthenticationService) { }

  
  task: Task = {
    id: 0,
    title: null,
    content: null,
    createdDate: null,
    deadline: null,
    creator: {id: 0, userName: ''},
    creatorId: 0,
    executer: null,
    executerId: 0,
    status: 0,
    post: null,
    postId: null
  };
  taskId: number = 0
  isError: boolean = false
  loaded: boolean = true
  loaded2: boolean = true
  notAllowedToResponse: boolean = false
  notificationId: number = 0

  connectSubscription: Subscription

  async ngOnInit(): Promise<void> 
  {
    this.route.queryParams.subscribe(params => {
      this.taskId = Number(params["id"]) || 0;
      this.notificationId = Number(params["view"]) || 0;
    }); 

    await this.getTask();
    var now = new Date();
    if (  this.task.status == TaskService.processingT
          || this.task.status == TaskService.unApprovedT || this.task.status == TaskService.approvedT
          || (this.task.status == TaskService.waitingT && this.task.deadline.getTime() < now.getTime())) this.notAllowedToResponse = true;
  }
  async getTask()
  {
    this.loaded = false
    let url = this.apiService.backendHost + `/api/Tasks/Details/${this.taskId}/${this.auth.currentAccountValue.id}`;
    try 
    {
      this.task = await this.http.get<Task>(url).toPromise();
      this.task.deadline = new Date(this.task.deadline)
    }
    catch(e) { console.log(e); this.isError = true }
    this.loaded = true
  }
  async accept()
  {
    this.loaded = false
    let url = this.apiService.backendHost + `/api/Tasks/Accept/${this.taskId}/${this.auth.currentAccountValue.id}`;
    try 
    {
      await this.http.get<any>(url).toPromise()
      this.toast.toastSuccess("Chấp nhận task thành công!")
      this.notAllowedToResponse = true
    }
    catch(e) { console.log(e); this.isError = true; this.loaded = true }
  }

  async deny()
  {
    this.loaded2 = false
    let url = this.apiService.backendHost + `/api/Tasks/Deny/${this.taskId}/${this.auth.currentAccountValue.id}`;
    try 
    {
      await this.http.get<any>(url).toPromise()
      this.toast.toastSuccess("Từ chối task thành công!")
      this.notAllowedToResponse = true
    }
    catch(e) { console.log(e); this.isError = true; this.loaded2 = true }
  }

  async viewNotification()
  {
    let url = this.apiService.backendHost + `/api/Notifications/View/${this.notificationId}`;
    await this.http.get(url).toPromise();
  }

  async ngAfterViewInit(): Promise<void> {
    if (this.notificationId != 0) 
    {
      if (this.notify.connected) await this.viewNotification();
      else this.connectSubscription = this.notify.connectedSubject.subscribe(async connected => {
        if (connected) await this.viewNotification()
      })
    }
  }
  reviewPost()
  {
    window.open(this.apiService.frontEndHost_User + `/review?id=${this.task.postId}`, '_blank')
  }
}
