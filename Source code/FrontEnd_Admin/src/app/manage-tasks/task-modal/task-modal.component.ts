import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { NgbActiveModal, NgbDateStruct, NgbTimeStruct } from '@ng-bootstrap/ng-bootstrap';
import { ApiService } from 'app/api.service';
import { AuthenticationService } from 'app/authentication/authentication.service';
import { Task } from '../model';
import * as ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import { TaskService } from '../task.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-task-modal',
  templateUrl: './task-modal.component.html',
  styleUrls: ['./task-modal.component.css']
})
export class TaskModalComponent implements OnInit {

  task: Task = {
    id: 0,
    title: null,
    content: null,
    createdDate: null,
    deadline: null,
    creator: null,
    creatorId: 0,
    executer: null,
    executerId: 0,
    status: 0,
    post: null,
    postId: null,
    assignTime: null
  };
  name: string = '';
  loaded: boolean = true;
  notAllowed: boolean = false;

  focus: boolean;
  invalidDate: boolean = false;
  invalidTime: boolean = false;
  deadlineDate: NgbDateStruct;
  deadlineTime: NgbTimeStruct = {hour: 0, minute: 0, second: 0}

  public Editor = ClassicEditor;
  invalidContent: boolean = false;

  localFields: Object = { text: 'userName', value: 'id' };
  writers: any[] = []

  showAlert: boolean;
  alertMessage: string;

  constructor(private router: Router, public activeModal: NgbActiveModal, private http: HttpClient, private apiService: ApiService, public auth: AuthenticationService) { }

  async ngOnInit(): Promise<void> 
  {
    await this.getWriters();
    if (this.task.id != 0) 
    {
      await this.getTask();
      var deadline = new Date(this.task.deadline);
      var now = new Date();
      let diffInHours = 0
      if (this.task.assignTime != null)
      {
        var assign = new Date(this.task.assignTime);
        let diffInMs = assign.getTime() < now.getTime()? now.getTime() - assign.getTime(): 0;
        diffInHours = diffInMs / 1000 / 60 / 60;
      }
      if ( this.task.creatorId != this.auth.currentAccountValue.id                                               // Task không phải do người đang login tạo
           || this.task.status == TaskService.unApprovedT || this.task.status == TaskService.approvedT           // Task đang trong trạng thái chờ duyệt hoặc đã duyệt (Writer đã nộp bài rồi)
           || (this.task.status == TaskService.processingT && deadline.getTime() > now.getTime())                // Task đang đc thực hiện trong khi deadline vẫn còn time
           || (this.task.status == TaskService.waitingT && diffInHours <= 2)                                     // Task đang chờ phản hồi từ writer trong khoảng dưới 2 giờ từ lúc đc assign
        ) this.notAllowed = true //thì ko đc chỉnh sửa
    }
    this.router.events.subscribe((event) => {
      this.activeModal.close();
    });
  }

  async getTask()
  {
    let url = this.apiService.backendHost + `/api/Tasks/${this.task.id}`;
    try 
    {
      let result = await this.http.get<Task>(url).toPromise();
      if (result) 
      {
        this.task = result;
        this.task.deadline = new Date(this.task.deadline)
        this.deadlineDate = {day: this.task.deadline.getDate(), month: this.task.deadline.getMonth() + 1, year: this.task.deadline.getFullYear()}
        this.deadlineTime = { hour: this.task.deadline.getHours(), minute: this.task.deadline.getMinutes(), second: 0};
      }
    }
    catch(e) { console.log(e); this.activeModal.close('Failed') }
  }
  dateChange(event: any)
  {
    if (typeof(event) == 'string') this.invalidDate = true;
    else this.invalidDate = false;
  }
  timeChange(event: any)
  {
    if (event == null) this.invalidTime = true;
    else this.invalidTime = false;
  }
  onFocus()
  {
    if (this.task.content == null) this.invalidContent = true
    else this.invalidContent = false
  }
  async getWriters()
  {
    this.writers = await this.http.get<any[]>(this.apiService.backendHost + '/api/Statistics/Writers').toPromise();
  }
  async saveTask()
  {
    this.loaded = false;
    this.task.deadline = new Date(this.deadlineDate.year, this.deadlineDate.month - 1, this.deadlineDate.day, this.deadlineTime.hour, this.deadlineTime.minute);
    if (this.task.id == 0) await this.addTask();
    else await this.updateTask();
    this.loaded = true;
  }
  async addTask()
  {
    try 
    {
      this.task.createdDate = new Date()
      let url = this.apiService.backendHost + "/api/Tasks";
      let result = await this.http.post<any>(url, this.task).toPromise();
      this.task.id = result
      this.task.creator = {userName: this.auth.currentAccountValue.username, id: this.auth.currentAccountValue.id}
      this.checkTaskStatus()
      this.activeModal.close(this.task)
    }
    catch (e)  {
      console.log(e)
      this.showError('Tạo task không thành công!')
    }      
  }
  async updateTask()
  {
    try 
    {
      let headers: any = new HttpHeaders();
      headers.append('Content-Type', 'application/json');
      let url = this.apiService.backendHost + `/api/Tasks/${this.task.id}`;
      await this.http.put(url, this.task, headers).toPromise();
      this.checkTaskStatus();
      this.activeModal.close(this.task)
    }
    catch (e)
    {
      this.showError('Cập nhật task không thành công!')
      console.log(e)
    }      
  }
  showError(msg: string)
  {
    this.alertMessage = msg
    this.showAlert = true;
    document.getElementById("alertDiv").scrollIntoView();
    var _this = this;
    setTimeout(function(){
      _this.showAlert = false;
    }, 3000);
  }
  checkTaskStatus()
  {
    if (this.task.executerId != 0 && this.task.executerId != null) //Có assign writer cho task
    {
      this.task.status = TaskService.waitingT;
      this.task.executer = this.writers.find(w => w.id == this.task.executerId)
    }
    else // Không có assign writer
    {
      this.task.status = TaskService.unAssignedT
      this.task.executerId = null
      this.task.executer = null
    }
  }
}
