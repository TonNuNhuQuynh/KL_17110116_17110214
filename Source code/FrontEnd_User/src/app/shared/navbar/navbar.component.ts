import { Component, OnInit, ElementRef, AfterViewInit } from '@angular/core';
import { Location } from '@angular/common';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { LoginModalComponent } from 'app/shared/login-modal/login-modal.component';
import { LocationModalComponent } from '../location-modal/location-modal.component';
import { CinemasModalComponent } from '../cinemas-modal/cinemas-modal.component';
import { LocationService } from 'app/location.service';
import { AuthenticationService } from 'app/authentication/authentication.service';
import { RolesService } from 'app/authentication/roles.service';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ApiService } from 'app/api.service';

@Component({
    selector: 'app-navbar',
    templateUrl: './navbar.component.html',
    styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit, AfterViewInit {
    private toggleButton: any;
    private sidebarVisible: boolean;
    
    constructor(private http: HttpClient, private apiService: ApiService, private router: Router, public auth: AuthenticationService, private locationService: LocationService, private modalService: NgbModal, public location: Location, private element : ElementRef) 
    {
        this.sidebarVisible = false

    }
    
    query: string = '';
    isWriter: boolean = false;
    types: any[] = []
    themes: any[] = []

    ngOnInit() 
    {
        this.isWriter = this.auth.currentAccountValue != null && this.auth.currentAccountValue.roleName == RolesService.writer? true: false
        const navbar: HTMLElement = this.element.nativeElement
        this.toggleButton = navbar.getElementsByClassName('navbar-toggler')[0]
        this.router.events.subscribe((event) => { this.sidebarClose() })
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
    openLoginModal()
    {
        const modalRef = this.modalService.open(LoginModalComponent, {windowClass: "login"});

        modalRef.result.then(async (result: any) => 
        {
            if (result == 'Success') 
            {
                if (this.auth.currentAccountValue.roleName == RolesService.writer) this.router.navigate(['/writer']);
            }
        }, () => {})
    }
    openLocationModal()
    {
        const modalRef = this.modalService.open(LocationModalComponent, {windowClass: "fixed-right"});

        modalRef.result.then(async (result: any) => 
        {
            if (result == 'Success') window.location.reload();
        }, () => {})
    }
    openCinemasModal()
    {
        const modalRef = this.modalService.open(CinemasModalComponent, {windowClass: "rate"});
        modalRef.componentInstance.cityId = this.locationService.currentCity.id;
        modalRef.componentInstance.cityName = this.locationService.currentCity.name;
        modalRef.result.then(async () => { }, () => {})
    }
    search()
    {
        this.router.navigate(['/search'], {queryParams: {name: this.query}});
    }
    logout()
    {
        this.auth.logout()
        window.location.reload()
    }
    async ngAfterViewInit(): Promise<void> 
    {
        let result = await this.http.get<any>(this.apiService.backendHost + '/api/Posts/GetCategories').toPromise()
        this.types = result.types
        this.themes = result.themes
    }
}
