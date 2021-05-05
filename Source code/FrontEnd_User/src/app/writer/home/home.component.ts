import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ApiService } from 'app/api.service';
import { AuthenticationService } from 'app/authentication/authentication.service';
import { TaskService } from '../task-list/task.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {

  constructor(private datePipe: DatePipe, private http: HttpClient, private apiService: ApiService, private auth: AuthenticationService) { }

  finishTasks: number = 0
  waitingTasks: number = 0
  published: number = 0
  posts: number = 0
  now: Date = new Date()
  notifications: any[] = []
  writers: any[] = []
  tasks: any[] = []
  progress: any[] = []

  async ngOnInit(): Promise<void> 
  {
    await this.getNumbers()
    this.now = new Date()
    await this.getNotifications()
    await this.getWriters()
    await this.getTasks()
    this.checkStatus()
  }
  async getNumbers()
  {
    let url = this.apiService.backendHost + `/api/Statistics/Writers/${this.auth.currentAccountValue.id}`;
    try
    {
      let result = await this.http.get<any>(url).toPromise();
      this.finishTasks = result.finishTasks
      this.waitingTasks = result.waitingTasks
      this.published = result.published
      this.posts = result.posts
    }
    catch(e) { console.log(e) }
  }

  async getNotifications()
  {
    let url = this.apiService.backendHost + `/api/Statistics/RecentNotifications/${this.auth.currentAccountValue.id}`;
    try
    {
      this.notifications = await this.http.get<any[]>(url).toPromise();
    }
    catch(e) { console.log(e) }
  }

  async getWriters()
  {
    let url = this.apiService.backendHost + `/api/Statistics/OnlineWriters/${this.auth.currentAccountValue.id}`;
    try
    {
      this.writers = await this.http.get<any[]>(url).toPromise();
    }
    catch(e) { console.log(e) }
  }

  async getTasks()
  {
    let url = this.apiService.backendHost + `/api/Statistics/RecentTasks/${this.auth.currentAccountValue.id}`;
    try
    {
      this.tasks = await this.http.get<any[]>(url).toPromise();
    }
    catch(e) { console.log(e) }
  }

  calculateDiff(date: string): string
  {
    let d2: Date = new Date();
    let d1 = new Date(date);
    // var diffYears = d2.getFullYear() - d1.getFullYear()
    // if (diffYears >= 1) return diffYears + (diffYears > 1? " years": " year")
    // var diffMonths = diffYears * 12 + (d2.getMonth() - d1.getMonth())
    // if (diffMonths >= 1) return diffMonths + (diffMonths > 1? " mons": " mon")
    var diffMs = d2.getTime() - d1.getTime()
    var diffDays = Math.floor(diffMs / 86400000); // days
    var diffHrs = Math.floor((diffMs % 86400000) / 3600000); // hours
    var diffMins = Math.round(((diffMs % 86400000) % 3600000) / 60000); // minutes
    if (diffDays > 30) return this.datePipe.transform(d1, 'dd/MM/yyyy')
    if (diffDays >= 1 && diffDays <= 30) return diffDays + (diffDays > 1? " days": " day")
    if (diffHrs >= 1) return diffHrs + (diffHrs > 1? " hrs": " hr")
    if (diffMins >= 1) return diffMins + (diffMins > 1? " mins": " min")
    else return "now";
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
  
      if (t.status == TaskService.waitingT) this.progress.push({status: 'Chờ phản hồi', percent: 20 })
      if (t.status == TaskService.processingT) this.progress.push({status: 'Đang thực hiện', percent: 50 }) 
        else if (t.status == TaskService.timeUpT) this.progress.push({status: 'Sắp đến hạn', percent: 50 }) 
        else if (t.status == TaskService.overdueT) this.progress.push({status: 'Hết hạn', percent: 50 }) 
      else if (t.status == TaskService.unApprovedT) this.progress.push({status: 'Chờ duyệt', percent: 80 })
      else if (t.status == TaskService.approvedT) this.progress.push({status: 'Hoàn thành', percent: 100 })

    })
  }
}
