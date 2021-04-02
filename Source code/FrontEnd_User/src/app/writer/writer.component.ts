import { Component, OnInit } from '@angular/core';
import { AuthenticationService } from 'app/authentication/authentication.service';

@Component({
  selector: 'app-writer',
  templateUrl: './writer.component.html',
  styleUrls: ['./writer.component.scss'],
})
export class WriterComponent implements OnInit {

  constructor(public auth: AuthenticationService) { }

  ngOnInit(): void 
  {
    // $('#sidebarCollapse').on('click', function () {
    //   $('#mySidenav').toggleClass("active")
    //   $('#content').toggleClass("overlap")
    //   $('#writer-footer').toggleClass("overlap")
    // });
    
  }
  logout()
  {
    this.auth.logout();
    window.location.reload();
  }
}
