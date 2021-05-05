import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import 'rxjs/add/operator/filter';
import { Location } from '@angular/common';
import { AuthenticationService } from './authentication/authentication.service';
import { HttpClient } from '@angular/common/http';
import { ApiService } from './api.service';
import { NotificationService } from './writer/notification.service';
import { Subscription } from 'rxjs/Subscription';
import { RolesService } from './authentication/roles.service';
import { Meta, Title } from '@angular/platform-browser';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {
    isWriter: boolean = false
    notifySubscription: Subscription

    constructor(private titleService: Title, private metaService: Meta, private notify: NotificationService, router: Router, public location: Location, private apiService: ApiService, private auth: AuthenticationService, private http: HttpClient) 
    {
        router.events.filter(event => event instanceof NavigationEnd).subscribe((val: any) => 
        {
            if (val.url.includes('writer') ) this.isWriter = true;
            else this.isWriter = false;

            if (val.url.includes('post') == false) 
            {
                this.titleService.setTitle('Moviefy')
                this.metaService.addTags([
                    { name: 'description', content: 'Trang tin tức điện ảnh, đánh giá phim và mua vé xem phim' },
                ])
            }
        })
    }
    
    ngOnInit() {
        var ua = window.navigator.userAgent;
        var trident = ua.indexOf('Trident/');
        if (trident > 0) {
            // IE 11 => return version number
            var rv = ua.indexOf('rv:');
            var version = parseInt(ua.substring(rv + 3, ua.indexOf('.', rv)), 10);
        }
        if (version) {
            var body = document.getElementsByTagName('body')[0];
            body.classList.add('ie-background');

        }

    }
    removeFooter() {
        var titlee = this.location.prepareExternalUrl(this.location.path());
        titlee = titlee.slice( 1 );
        if(titlee === 'signup' || titlee === 'nucleoicons'){
            return false;
        }
        else {
            return true;
        }
    }

    async ngAfterViewInit(): Promise<void> 
    {
        this.notifySubscription = this.notify.notifySubject.subscribe(action => {
            // Nếu notification chưa đc đọc thì thông báo
            if (!action.isViewed && !window.location.href.includes('writer') && this.auth.currentAccountValue.roleName == RolesService.writer) alert('Bạn có thông báo mới từ Moviefy Editor!')
        });

        if (this.auth.currentAccountValue)
        {
            try
            {
                let result = await this.http.post<any>(this.apiService.backendHost + '/api/Accounts/UserInfo', this.auth.currentAccountValue).toPromise()
                this.auth.setAccount = result.account
                this.auth.activityStorage = result.activities
            }
            catch(e) {console.log(e); this.auth.logout(); window.location.reload()}
        }      
    }
    ngOnDestroy(): void 
    {
        this.notify.disconnect()
        this.notifySubscription.unsubscribe()
    }
    
}
