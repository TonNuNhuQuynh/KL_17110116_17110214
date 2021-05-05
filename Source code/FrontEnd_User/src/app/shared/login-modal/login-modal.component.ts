import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { FacebookLoginProvider, GoogleLoginProvider, SocialAuthService, SocialUser } from 'angularx-social-login';
import { ApiService } from 'app/api.service';
import { AuthenticationService } from 'app/authentication/authentication.service';
import { Account } from 'app/authentication/model';

@Component({
  selector: 'app-login-modal',
  templateUrl: './login-modal.component.html',
  styleUrls: ['./login-modal.component.css']
})
export class LoginModalComponent implements OnInit {

  constructor(private externalAuthService: SocialAuthService, public activeModal: NgbActiveModal, private http: HttpClient, private apiService: ApiService, private auth: AuthenticationService) 
  { }
  account: Account;
  remember: boolean = false;
  showAlert: boolean = false;
  alertMsg: string = '';
  isLoaded: boolean = true;

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
  private createHeader(): any {
    return { headers: new HttpHeaders({ 'Content-Type': 'application/json' }), responseType: 'text' };
  }
  async login()
  {
    this.isLoaded = false;
    let url = this.apiService.backendHost + `/api/Accounts/Login`;
    try 
    {
      let result = await this.http.post(url, this.account).toPromise() as any;
      if (result == 'email') this.setAlert("Chưa xác nhận email");
      else if (result == 'locked') this.setAlert("Tài khoản đã bị khóa!");
      else 
      {
        this.auth.saveAccount(result.account, this.remember, result.activities, result.token);
        this.closeModal('Success');
      }
    } 
    catch(e) 
    {
      this.setAlert('Tài khoản không tồn tại!');
    }
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

  closeModal(result: any)
  {
    this.activeModal.close(result);
  }
  async loginWithGoogle()
  {
    this.externalAuthService.signIn(GoogleLoginProvider.PROVIDER_ID)
    .then(async res => {
      const user: SocialUser = { ...res };
      this.isLoaded = false;
      let url = this.apiService.backendHost + `/api/Accounts/LoginGoogle`;
      try 
      {
        let result = await this.http.post(url, {provider: user.provider, token: user.idToken}).toPromise() as any;
        if (result == 'email') this.setAlert("Chưa xác nhận email");
        else if (result == 'locked') this.setAlert("Tài khoản đã bị khóa!");
        else 
        {
          this.auth.saveAccount(result.account, true, result.activities, result.token);
          this.closeModal('Success');
        }
      } 
      catch(e) 
      {
        this.setAlert('Tài khoản không tồn tại!');
      }
      this.isLoaded = true;
    }, error => console.log(error))
  }
  async loginWithFacebook()
  {
    this.externalAuthService.signIn(FacebookLoginProvider.PROVIDER_ID)
    .then(async res => {
      const user: SocialUser = { ...res };
      
      this.isLoaded = false;
      let url = this.apiService.backendHost + `/api/Accounts/LoginFacebook`;
      try 
      {
        let result = await this.http.post(url, {provider: user.provider, token: user.authToken}).toPromise() as any;
        if (result == 'email') this.setAlert("Chưa xác nhận email");
        else if (result == 'locked') this.setAlert("Tài khoản đã bị khóa!");
        else 
        {
          this.auth.saveAccount(result.account, true, result.activities, result.token);
          this.closeModal('Success');
        }
      } 
      catch(e) 
      {
        this.setAlert('Tài khoản không tồn tại!');
      }
      this.isLoaded = true;
    }, error => console.log(error))
  }
}
