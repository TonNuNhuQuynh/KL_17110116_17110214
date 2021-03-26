import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Account } from 'app/manage-accounts/model'
import { StorageService } from 'app/storage.service';
import * as CryptoJS from 'crypto-js';
import { environment } from 'environments/environment.prod';
import { JwtHelperService } from '@auth0/angular-jwt';

@Injectable({
    providedIn: 'root',
})

export class AuthenticationService 
{
   public currentAccountSubject: BehaviorSubject<Account>;
   public remember: boolean = false;

   constructor(private jwtHelper: JwtHelperService) 
   {
    //    let account = localStorage.getItem(this.account_storage);
    //    if (account == null) 
    //    {
    //        account = sessionStorage.getItem(this.account_storage);
    //        this.remember = false;
    //    }
    //    else this.remember = true;
       
    //    let temp = null;
    //    if (account != null)
    //    {
    //        temp = JSON.parse(account)
    //        temp.roleName = CryptoJS.AES.decrypt(temp.roleName, environment.aes_key.trim()).toString(CryptoJS.enc.Utf8)
    //    }
    //    this.currentAccountSubject = new BehaviorSubject<Account>(temp);

       let token = localStorage.getItem(StorageService.token)
       if (token == null) 
       {
           token = sessionStorage.getItem(StorageService.token)
           this.remember = false
       }
       else this.remember = true
       let temp: Account = null
       if (token != null)
       {
           let id = localStorage.getItem(StorageService.id)? localStorage.getItem(StorageService.id): sessionStorage.getItem(StorageService.id)
           let role = localStorage.getItem(StorageService.role)? localStorage.getItem(StorageService.role): sessionStorage.getItem(StorageService.role)
           temp = {
               id: id? Number(CryptoJS.AES.decrypt(id, environment.aes_key.trim()).toString(CryptoJS.enc.Utf8)): 0,
               username: '', password: '', email: '', phone: null,
               roleName: role? CryptoJS.AES.decrypt(role, environment.aes_key.trim()).toString(CryptoJS.enc.Utf8): "",
               isActive: true,
               user: { fullname: '', area: null, image: null, accountId: 0 }
            }
       }
       this.currentAccountSubject = new BehaviorSubject<Account>(temp);
   }
  
   public get currentAccountValue(): Account 
   {
        return this.currentAccountSubject.value;
   }
   public set setAccount(account: Account)  
   {
        this.currentAccountSubject.next(account)
   }

   public saveAccount(account: Account, remember: boolean, token: string)
   {
       this.remember = remember;
       let id = CryptoJS.AES.encrypt(account.id.toString(), environment.aes_key.trim()).toString()
       let role = CryptoJS.AES.encrypt(account.roleName, environment.aes_key.trim()).toString()
       if (this.remember)
       {
            localStorage.setItem(StorageService.id, id)
            localStorage.setItem(StorageService.role, role)
            localStorage.setItem(StorageService.token, token)
       }
       else 
       {
           sessionStorage.setItem(StorageService.id, id)
           sessionStorage.setItem(StorageService.role, role)
           sessionStorage.setItem(StorageService.token, token)
       }
       this.currentAccountSubject.next(account);
   }
   public logout()
   {
    //    if (this.remember)
    //    {
    //        localStorage.removeItem(this.account_storage);
    //        this.remember = false;
    //    }
    //    else sessionStorage.removeItem(this.account_storage); 
       if (this.remember)
       {
            localStorage.removeItem(StorageService.id)
            localStorage.removeItem(StorageService.role)
            localStorage.removeItem(StorageService.token)
       }
       else 
       {
           sessionStorage.removeItem(StorageService.id)
           sessionStorage.removeItem(StorageService.role)
           sessionStorage.removeItem(StorageService.token)
       }
       this.currentAccountSubject.next(null);
   }
   public isAuthenticated(): boolean 
   {
       const token = this.remember? localStorage.getItem(StorageService.token): sessionStorage.getItem(StorageService.token);
       if (token && !this.jwtHelper.isTokenExpired(token) && this.currentAccountSubject.value) return true 
       this.logout()
       return false
   }
   public updateProfilePic(base64: string)
   {
       let account = this.currentAccountSubject.value;
       account.user.image = base64;
       this.currentAccountSubject.next(account);
   }
}