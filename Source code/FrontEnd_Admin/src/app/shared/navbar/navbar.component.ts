import { Component, OnInit, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { DatePipe, Location } from '@angular/common';
import { AuthenticationService } from 'app/authentication/authentication.service';
import { RolesService } from 'app/manage-accounts/roles.service';
import { NavigationEnd, Router } from '@angular/router';
import { ApiService } from 'app/api.service';
import { Subscription } from 'rxjs';
import { Notification, NotificationService } from '../../notification.service'
import { HttpClient } from '@angular/common/http';
import { NgbDropdown } from '@ng-bootstrap/ng-bootstrap';

@Component({
    selector: 'app-navbar',
    templateUrl: './navbar.component.html',
    styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit, OnDestroy {

    private toggleButton: any;
    private sidebarVisible: boolean;
    notifications: Notification[] = null
    notifySubscription: Subscription
    authSubscription: Subscription

    // isAdmin: boolean = false;
    isSupAdmin: boolean = false;
    query: string = '';
    @ViewChild('notiDropdown') notiDropdown: NgbDropdown;

    constructor(private datePipe: DatePipe, private http: HttpClient, private notify: NotificationService, private apiService: ApiService, private router: Router, public auth: AuthenticationService, public location: Location, private element : ElementRef) 
    {
        this.sidebarVisible = false;
        
    }

    
    ngOnInit() {
        const navbar: HTMLElement = this.element.nativeElement;
        this.toggleButton = navbar.getElementsByClassName('navbar-toggler')[0];

        this.router.events.filter(event => event instanceof NavigationEnd).subscribe((val: any) => 
        {
            // if (val.url.includes('admin') ) 
            // {
            //     this.isAdmin = true
            //     this.isSupAdmin = this.auth.currentAccountValue == null ? false: this.auth.currentAccountValue.roleName == RolesService.superAdmin
            // }
            // else this.isAdmin = false
            if (this.notiDropdown?.isOpen()) this.notiDropdown.close()
        })
        this.authSubscription = this.auth.currentAccountSubject.subscribe(async account => {
            if (account != null) 
            {
                this.isSupAdmin = this.auth.currentAccountValue.roleName == RolesService.superAdmin
                if (this.notifications == null) await this.getNotifications()
            }
        })

        this.notifySubscription = this.notify.notifySubject.subscribe(action => {
            if (action.isViewed) this.notifications = this.notifications.filter(n => n.id != action.id)
            else this.notifications.push(action.notification)
        })
    }
    sidebarOpen() {
        const toggleButton = this.toggleButton;
        const html = document.getElementsByTagName('html')[0];

        setTimeout(function(){
            toggleButton.classList.add('toggled');
        }, 500);
        html.classList.add('nav-open');

        this.sidebarVisible = true;
    };
    sidebarClose() {
        const html = document.getElementsByTagName('html')[0];
        this.toggleButton.classList.remove('toggled');
        this.sidebarVisible = false;
        html.classList.remove('nav-open');
    };
    sidebarToggle() {
        if (this.sidebarVisible === false) {
            this.sidebarOpen();
        } else {
            this.sidebarClose();
        }
    };
    isHome() {
      var titlee = this.location.prepareExternalUrl(this.location.path());
      if(titlee.charAt(0) === '#'){
          titlee = titlee.slice( 1 );
      }
        if( titlee === '/home' ) {
            return true;
        }
        else {
            return false;
        }
    }
    isDocumentation() 
    {
      var titlee = this.location.prepareExternalUrl(this.location.path());
      if(titlee.charAt(0) === '#'){
          titlee = titlee.slice( 1 );
      }
        if( titlee === '/documentation' ) {
            return true;
        }
        else {
            return false;
        }
    }
    
    logout()
    {
        this.auth.logout();
        this.router.navigate(['/login'])
    }
    async getNotifications()
    {
        let url = this.apiService.backendHost + `/api/Notifications/${this.auth.currentAccountValue.id}`;
        this.notifications = await this.http.get<Notification[]>(url).toPromise();
    }

    
    ngOnDestroy(): void 
    { 
        this.notify.disconnect()
        if (this.notifySubscription) this.notifySubscription.unsubscribe()
        if (this.authSubscription) this.authSubscription.unsubscribe()
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
    var diffMs = d2.getTime() - d1.getTime()
    var diffDays = Math.floor(diffMs / 86400000); // days
    var diffHrs = Math.floor((diffMs % 86400000) / 3600000); // hours
    var diffMins = Math.round(((diffMs % 86400000) % 3600000) / 60000); // minutes
    if (diffDays > 30) return this.datePipe.transform(d1, 'dd/MM/yyyy')
    if (diffDays >= 1 && diffDays <= 30) return diffDays + " ng??y tr?????c"
    if (diffHrs >= 1) return diffHrs + " gi??? tr?????c"
    if (diffMins >= 1) return diffMins + " ph??t tr?????c"
    else return "V???a xong";
  }
}
