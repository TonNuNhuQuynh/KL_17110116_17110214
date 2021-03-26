import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from 'app/api.service';
import { AuthenticationService } from 'app/authentication/authentication.service';
import { Account } from 'app/manage-accounts/model';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  constructor(private router: Router, private http: HttpClient, private apiService: ApiService, private auth: AuthenticationService) 
  { 
    if (router.getCurrentNavigation().extras.state != null) this.redirectUrl = this.router.getCurrentNavigation().extras.state.callbackUrl;
  }

  account: Account;
  remember: boolean = false;
  showAlert: boolean = false;
  alertMsg: string = '';
  isLoaded: boolean = true;
  redirectUrl: string = null;

  ngOnInit(): void 
  {
    this.account = {
      id: 0,
      username: '',
      password: '',
      email: '',
      phone: null,
      roleName: "User",
      user: {image: null, area: null, fullname: null, accountId: 0},
      isActive: false
    }
  }

  async login()
  {
    this.isLoaded = false;
    let url = this.apiService.backendHost + `/api/Accounts/LoginAdmin`;
    try 
    {
      let result = await this.http.post(url, this.account).toPromise() as any;
      if (result == 'email') this.setAlert("Chưa xác nhận email");
      else if (result == 'locked') this.setAlert("Tài khoản đã bị khóa!");
      else 
      {
        this.auth.saveAccount(result.account, this.remember, result.token);
        if (this.redirectUrl != null) this.router.navigateByUrl(this.redirectUrl);
        else this.router.navigate(['admin'])
      }
    } 
    catch(e) { this.setAlert('Tài khoản không tồn tại!'); console.log(e) }
    this.isLoaded = true;
  }
  setAlert(msg: string)
  {
    this.showAlert = true;
    this.alertMsg = msg;
    var _this = this;
    setTimeout(function() 
    {
      _this.showAlert = false;
    }, 4000);
  }
}
