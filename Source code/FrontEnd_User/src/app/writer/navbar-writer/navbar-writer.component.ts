import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Location} from '@angular/common';
import { AuthenticationService } from 'app/authentication/authentication.service';
import { ApiService } from 'app/api.service';
import { NotificationService } from '../notification.service';
import { Notification } from '../model'
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs/Subscription';
import { NgbDropdown } from '@ng-bootstrap/ng-bootstrap';

@Component({
    moduleId: module.id,
    selector: 'navbar-writer',
    templateUrl: 'navbar-writer.component.html',
    styleUrls: ['navbar-writer.component.scss'],
})

export class NavbarWriterComponent implements OnInit, AfterViewInit, OnDestroy{
  location: Location;
  private nativeElement: Node;
  private toggleButton;
  private sidebarVisible: boolean;

  public isCollapsed = true;

  notifications: Notification[] = []
  notifySubscription: Subscription

  @ViewChild("navbar-writer", {static: false}) button;
  @ViewChild('notiDropdown') notiDropdown: NgbDropdown;

  constructor(private notify: NotificationService,  public auth: AuthenticationService, location: Location, private apiService : ApiService, private element : ElementRef, private router: Router, private http: HttpClient) {
    this.location = location;
    this.nativeElement = element.nativeElement;
    this.sidebarVisible = false;

  }
  ngOnDestroy(): void 
  {
    if (this.notifySubscription) this.notifySubscription.unsubscribe();
  }

  
  async ngAfterViewInit(): Promise<void>
  {
    await this.getNotifications();
    //this.notify.connect(this.apiService, this.auth.currentAccountValue.id);  
    this.notifySubscription = this.notify.notifySubject.subscribe(action => {
      // Nếu notification đc đọc rồi thì xóa đi
      if (action.isViewed) this.notifications = this.notifications.filter(n => n.id != action.id)
      // Nếu có notification mới thì thêm vào
      else this.notifications.push(action.notification)
    });
  }

  ngOnInit()
  {      
    var navbar : HTMLElement = this.element.nativeElement;
    this.toggleButton = navbar.getElementsByClassName('navbar-toggle')[0]
    this.router.events.subscribe((event) => { 
      this.sidebarClose()
      if (this.notiDropdown?.isOpen()) this.notiDropdown.close()
    })
  }

  async getNotifications()
  {
    let url = this.apiService.backendHost + `/api/Notifications/${this.auth.currentAccountValue.id}`;
    this.notifications = await this.http.get<Notification[]>(url).toPromise();
  }

  getTitle()
  {
    var titlee = this.location.prepareExternalUrl(this.location.path());
    if(titlee.charAt(0) === '#'){
        titlee = titlee.slice( 1 );
    }
    return 'Dashboard';
  }
  sidebarToggle() 
  {
    if (this.sidebarVisible === false) this.sidebarOpen();
    else this.sidebarClose();
  }
  sidebarOpen() 
  {
    const toggleButton = this.toggleButton;
    const html = document.getElementsByTagName('html')[0];
    const mainPanel =  <HTMLElement>document.getElementsByClassName('main-panel')[0];
    setTimeout(function()
    {
      toggleButton.classList.add('toggled');
    }, 500);

    html.classList.add('nav-open');
    if (window.innerWidth < 991) {
      mainPanel.style.position = 'fixed';
    }
    this.sidebarVisible = true;
  };
  sidebarClose() {
      const html = document.getElementsByTagName('html')[0];
      const mainPanel =  <HTMLElement>document.getElementsByClassName('main-panel')[0];
      if (window.innerWidth < 991) {
        setTimeout(function(){
          mainPanel.style.position = '';
        }, 500);
      }
      this.toggleButton.classList.remove('toggled');
      this.sidebarVisible = false;
      html.classList.remove('nav-open');
  };
  collapse(){
    this.isCollapsed = !this.isCollapsed;
    const navbar = document.getElementsByTagName('nav')[0];
    if (!this.isCollapsed) {
      navbar.classList.remove('navbar-transparent');
      navbar.classList.add('bg-white');
    }else{
      navbar.classList.add('navbar-transparent');
      navbar.classList.remove('bg-white');
    }
  }
  logout()
  {
    this.auth.logout();
    this.router.navigate(['home']);
  }
  async viewAll()
  {
    var ids = [];
    this.notifications.forEach(n => { ids.push(n.id);})
    let url = this.apiService.backendHost + `/api/Notifications`
    await this.http.post(url, ids).toPromise();
  }
  calculateDiff(date: string): string
  {
    let d2: Date = new Date();
    let d1 = new Date(date);
    var diffYears = d2.getFullYear() - d1.getFullYear()
    if (diffYears >= 1) return diffYears + " năm trước"
    var diffMonths = diffYears * 12 + (d2.getMonth() - d1.getMonth())
    if (diffMonths >= 1) return diffMonths + " tháng trước"
    var diffMs = d2.getTime() - d1.getTime()
    var diffDays = Math.floor(diffMs / 86400000); // days
    var diffHrs = Math.floor((diffMs % 86400000) / 3600000); // hours
    var diffMins = Math.round(((diffMs % 86400000) % 3600000) / 60000); // minutes
    if (diffDays >= 1) return diffDays + " ngày trước"
    if (diffHrs >= 1) return diffHrs + " giờ trước"
    if (diffMins >= 1) return diffMins + " phút trước"
    else return "Vừa xong";
  }
}
