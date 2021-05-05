import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ApiService } from 'app/api.service';
import { AuthenticationService } from 'app/authentication/authentication.service';


@Component({
  selector: 'app-pick-task',
  templateUrl: './pick-task.component.html',
  styleUrls: ['./pick-task.component.scss']
})
export class PickTaskComponent implements OnInit {

  constructor(private auth: AuthenticationService, private http: HttpClient, public activeModal: NgbActiveModal, private apiService: ApiService) { }
  isLoaded: boolean = false
  loaded: boolean = true
  tasks: any[] = []
  postId: number = 0

  async ngOnInit(): Promise<void> 
  {
    await this.getPendingTasks()
  }
  async getPendingTasks()
  {
    let url = this.apiService.backendHost + `/api/Tasks/Pendings/${this.auth.currentAccountValue.id}`;
    this.tasks = await this.http.get<any[]>(url).toPromise();
    this.isLoaded = true
    console.log(this.tasks)
  }
  async sendPost(id: number, name: string)
  {
    let r = confirm(`Bạn có chắc gửi bài viết cho task '${name}'?`)
    if (r)
    {
      this.isLoaded = false
      let url = this.apiService.backendHost + `/api/Posts/Send/${this.postId}/${id}`;
      try
      {
        await this.http.get(url).toPromise()
        this.activeModal.close({id: id, title: name})
      }
      catch(e) {console.log(e); this.activeModal.close('Failed')}    
    }
  }
}
