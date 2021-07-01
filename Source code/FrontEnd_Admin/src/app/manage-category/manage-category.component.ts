import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { DataTableDirective } from 'angular-datatables';
import { ApiService } from 'app/api.service';
import { ToastService } from 'app/toast/toast.service';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-manage-category',
  templateUrl: './manage-category.component.html',
  styleUrls: ['./manage-category.component.css']
})
export class ManageCategoryComponent implements OnInit, OnDestroy {

  dtOptions: DataTables.Settings = {};
  dtTrigger: Subject<any> = new Subject();
  @ViewChild(DataTableDirective) dtElement: DataTableDirective;

  modes: any[] = [  {id: 1, name: 'Ngôn ngữ phim'}, 
                    {id: 2, name: 'Thể loại phim'},
                    {id: 3, name: 'Loại bài viết'},
                    {id: 4, name: 'Chuyên đề bài viết'} ]
  modeId: number = 1
  modeText: string = 'Ngôn ngữ phim'
  languages: any[] = []                  
  genres: any[] = []
  types: any[] = []
  themes: any[] = []
  category: any[] = []
  categoryId: number = 0
  name: string = ""
  description: string = ""
  views: number = 0
  loading: boolean = false
  isAdded: boolean = true

  @ViewChild('form', {static: false}) form: NgForm;

  constructor(private toast: ToastService, private http: HttpClient, private apiService: ApiService, private chRef : ChangeDetectorRef) { }
  
  async ngOnInit(): Promise<void> 
  {
    this.dtOptions = {
      pagingType: 'full_numbers',
      lengthMenu: [10, 15, 20],
      autoWidth: true }
    
    await this.initTable()

    this.chRef.detectChanges();
    this.dtTrigger.next();
  }
  async initTable()
  {
    let url = this.apiService.backendHost + "/api/Languages";
    this.languages = await this.http.get<any[]>(url).toPromise();
    this.category = this.languages
  }
  async getGenres()
  {
    let url = this.apiService.backendHost + "/api/Genres";
    this.genres = await this.http.get<any[]>(url).toPromise();
  }
  async getPostTypes()
  {
    let url = this.apiService.backendHost + "/api/PostTypes";
    this.types = await this.http.get<any[]>(url).toPromise();
  }
  async getPostThemes()
  {
    let url = this.apiService.backendHost + "/api/PostThemes";
    this.themes = await this.http.get<any[]>(url).toPromise();
  }
  async chooseMode()
  {
    this.loading = true
    if (this.modeId == 1) this.category = this.languages
    else if (this.modeId == 2) 
    {
      if (this.genres.length == 0) await this.getGenres()
      this.category = this.genres
    }
    else if (this.modeId == 3) 
    {
      if (this.types.length == 0) await this.getPostTypes()
      this.category = this.types
    }
    else if (this.modeId == 4) 
    {
      if (this.themes.length == 0) await this.getPostThemes()
      this.category = this.themes
    }
    this.rerender()
    this.loading = false
    this.modeText = this.modes.find(m => m.id == this.modeId).name
    this.cancel()
  }
  cancel()
  {
    this.isAdded = true
    this.name = ''
    this.description = ''
    this.categoryId = 0
    this.form.form.markAsPristine();
    this.form.form.markAsUntouched();
  }
  view(id: number)
  {
    this.categoryId = id
    let category = this.category.find(c => c.id == id)
    this.name = category.name
    if (this.modeId == 3 || this.modeId == 4) 
    {
      this.description = category.description
      this.views = category.views
    }
    this.isAdded = false
  }

  ngOnDestroy(): void {
    this.dtTrigger.unsubscribe();
  }

  rerender() 
  {
    this.dtElement.dtInstance.then((dtInstance : DataTables.Api) => 
    {
      dtInstance.destroy()
      this.dtTrigger.next()
    });
  }
  async add()
  {
    try
    {
      let result = null
      if (this.modeId == 1) 
      {
        result = await this.http.post<any>(this.apiService.backendHost + '/api/Languages', {id: 0, name: this.name}).toPromise()
        this.languages.push(result)
        this.category = this.languages
      }
      else if (this.modeId == 2) 
      {
        result = await this.http.post<any>(this.apiService.backendHost + '/api/Genres', {id: 0, name: this.name}).toPromise()
        this.genres.push(result)
        this.category = this.genres
      }
      else if (this.modeId == 3) 
      {
        result = await this.http.post<any>(this.apiService.backendHost + '/api/PostTypes', {id: 0, name: this.name, description: this.description, views: 0}).toPromise()
        this.types.push(result)
        this.category = this.types
      }
      else if (this.modeId == 4)
      {
        result = await this.http.post<any>(this.apiService.backendHost + '/api/PostThemes', {id: 0, name: this.name, description: this.description, views: 0}).toPromise()
        this.themes.push(result)
        this.category = this.themes
      }
      this.rerender()
      this.toast.toastSuccess(`Thêm '${this.modeText}' thành công!`)
      this.cancel()
    }
    catch(e) 
    { 
      console.log(e)
      this.toast.toastError(`Thêm '${this.modeText}' không thành công!`)
    }
  }
  async save()
  {
    let headers: any = new HttpHeaders()
    headers.append('Content-Type', 'application/json')
    try
    {
      let result = null
      if (this.modeId == 1) 
      {
        result = await this.http.put<any>(this.apiService.backendHost + `/api/Languages/${this.categoryId}`, {id:this.categoryId, name: this.name}, headers).toPromise()
        this.category[this.category.findIndex(c => c.id == this.categoryId)] = result
        this.languages = this.category
      }
      else if (this.modeId == 2) 
      {
        result = await this.http.put<any>(this.apiService.backendHost + `/api/Genres/${this.categoryId}`, {id: this.categoryId, name: this.name}, headers).toPromise()
        this.category[this.category.findIndex(c => c.id == this.categoryId)] = result
        this.genres = this.category
      }
      else if (this.modeId == 3) 
      {
        result = await this.http.put<any>(this.apiService.backendHost + `/api/PostTypes/${this.categoryId}`, {id: this.categoryId, name: this.name, description: this.description, views: this.views}, headers).toPromise()
        this.category[this.category.findIndex(c => c.id == this.categoryId)] = result
        this.types = this.category
      }
      else if (this.modeId == 4)
      {
        result = await this.http.put<any>(this.apiService.backendHost + `/api/PostThemes/${this.categoryId}`, {id: this.categoryId, name: this.name, description: this.description, views: this.views}, headers).toPromise()
        this.category[this.category.findIndex(c => c.id == this.categoryId)] = result
        this.themes = this.category
      }
      this.rerender()
      this.toast.toastSuccess(`Cập nhật '${this.modeText}' thành công!`)
      this.cancel()
    }
    catch(e) 
    { 
      console.log(e)
      this.toast.toastError(`Cập nhật '${this.modeText}' không thành công!`)
    }
  }
  async delete(id: number, name: string)
  {
    let r = false
    if (this.modeId == 4) r = confirm(`Bạn có chắc muốn xóa ${this.modeText} '${name}' không? Việc xóa ${this.modeText} sẽ khiến cho một vài bài viết bị mất chuyên đề`)
    else r = confirm(`Bạn có chắc muốn xóa ${this.modeText} '${name}' không? Việc xóa sẽ không thành công nếu còn phim hoặc bài viết thuộc danh mục này`)

    if (!r) return
    try
    {
      if (this.modeId == 1) 
      {
        await this.http.delete(this.apiService.backendHost + `/api/Languages/${id}`).toPromise()
        this.category = this.category.filter(c => c.id != id)
        this.languages = this.category
      }
      else if (this.modeId == 2) 
      {
        await this.http.delete(this.apiService.backendHost + `/api/Genres/${id}`).toPromise()
        this.category = this.category.filter(c => c.id != id)
        this.genres = this.category
      }
      else if (this.modeId == 3) 
      {
        await this.http.delete(this.apiService.backendHost + `/api/PostTypes/${id}`).toPromise()
        this.category = this.category.filter(c => c.id != id)
        this.types = this.category
      }
      else if (this.modeId == 4)
      {
        await this.http.delete(this.apiService.backendHost + `/api/PostThemes/${id}`).toPromise()
        this.category = this.category.filter(c => c.id != id)
        this.themes = this.category
      }
      this.toast.toastSuccess(`Xóa '${this.modeText}' thành công!`)
      this.rerender()
    }
    catch(e) 
    { 
      console.log(e)
      this.toast.toastError(`Xóa '${this.modeText}' không thành công!`)
    }
  }
}
