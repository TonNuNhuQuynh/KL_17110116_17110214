import { Component, OnInit, Renderer2, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import 'rxjs/add/operator/filter';
import { Location } from '@angular/common';
import { NavbarComponent } from './shared/navbar/navbar.component';
import { HttpClient } from '@angular/common/http';
import { AuthenticationService } from './authentication/authentication.service';
import { ApiService } from './api.service';
import { Account } from 'app/manage-accounts/model'

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, AfterViewInit{
    
    @ViewChild(NavbarComponent) navbar: NavbarComponent;
    constructor(private renderer : Renderer2, private router: Router, private element : ElementRef, public location: Location, private http: HttpClient, private auth: AuthenticationService, private apiService: ApiService) {}
    
    
    ngOnInit() {
        var navbar : HTMLElement = this.element.nativeElement.children[0].children[0];
        this.renderer.listen('window', 'scroll', () => {
            const number = window.scrollY;
            if (number > 150 || window.pageYOffset > 150) {
                // add logic
                navbar.classList.remove('navbar-transparent');
            } else {
                // remove logic
                navbar.classList.add('navbar-transparent');
            }
        });
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
        if (this.auth.currentAccountValue)
        {
            try
            {
                let result = await this.http.post<Account>(this.apiService.backendHost + '/api/Accounts/AdminInfo', this.auth.currentAccountValue).toPromise()
                this.auth.setAccount = result
            }
            catch(e) {console.log(e); this.auth.logout(); window.location.reload()}
        }      
    }
}
