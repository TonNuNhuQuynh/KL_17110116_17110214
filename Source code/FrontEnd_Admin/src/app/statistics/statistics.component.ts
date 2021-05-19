import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { DataTableDirective } from 'angular-datatables';
import { ApiService } from 'app/api.service';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-statistics',
  templateUrl: './statistics.component.html',
  styleUrls: ['./statistics.component.css']
})
export class StatisticsComponent implements OnInit, OnDestroy {

  constructor(private http: HttpClient, private apiService: ApiService, private chRef : ChangeDetectorRef) { }
  
  title: string = 'Thống kê lượt đánh giá của phim'
  column1: string = 'Tên phim'
  column2: string = 'Lượt đánh giá'
  tableData: any[] = []
  loading: boolean = false
  dtOptions: DataTables.Settings = {};
  dtTrigger: Subject<any> = new Subject();
  @ViewChild(DataTableDirective) dtElement: DataTableDirective;

  async ngOnInit(): Promise<void> 
  {
    this.dtOptions = {
      pagingType: 'full_numbers',
      lengthMenu: [10, 15, 20, 30, 40],
      autoWidth: true,
      order: [[1, 'desc']]
    }

    await this.getReviews()
    this.chRef.detectChanges()
    this.dtTrigger.next()
  }
  async chooseMode(mode: number)
  {
    this.loading = true
    try
    {
      if (mode == 1) 
      {
        this.title = 'Thống kê lượt đánh giá của phim'
        this.column1 = 'Tên phim'
        this.column2 = 'Lượt đánh giá'
        await this.getReviews()
      }

      if (mode == 2) 
      {
        this.title = 'Thống kê lượt mua vé của phim'
        this.column1 = 'Tên phim'
        this.column2 = 'Lượt mua vé'
        await this.getOrders()
      }

      if (mode == 3) 
      {
        this.title = 'Thống kê lượt xem từng loại bài viết'
        this.column1 = 'Loại bài viết'
        this.column2 = 'Lượt xem'
        await this.getPostTypes()
      }

      if (mode == 4) 
      {
        this.title = 'Thống kê lượt xem từng chuyên đề bài viết'
        this.column1 = 'Chuyên đề bài viết'
        this.column2 = 'Lượt xem'
        await this.getPostThemes()
      }

      this.rerender()
    }
    catch(e) { console.log(e) }
    this.loading = false
  }

  async getReviews()
  {
    let url = this.apiService.backendHost + "/api/Statistics/Reviews"
    this.tableData = await this.http.get<any[]>(url).toPromise()
  }
  async getOrders()
  {
    let url = this.apiService.backendHost + "/api/Statistics/Orders"
    this.tableData = await this.http.get<any[]>(url).toPromise()
  }

  async getPostTypes()
  {
    let url = this.apiService.backendHost + "/api/PostTypes"
    let result = await this.http.get<any[]>(url).toPromise()
    this.tableData = result.map(
      obj => {
        return { "name" : obj.name, "count": obj.views }
      }
    )
  }
  async getPostThemes()
  {
    let url = this.apiService.backendHost + "/api/PostThemes";
    let result = await this.http.get<any[]>(url).toPromise()
    this.tableData = result.map(
      obj => {
        return { "name" : obj.name, "count": obj.views }
      }
    )
  }

  ngOnDestroy(): void {
    this.dtTrigger.unsubscribe()
  }

  rerender() 
  {
    this.dtElement.dtInstance.then((dtInstance : DataTables.Api) => 
    {
      dtInstance.destroy()
      this.dtTrigger.next()
    });
  }
  
}
