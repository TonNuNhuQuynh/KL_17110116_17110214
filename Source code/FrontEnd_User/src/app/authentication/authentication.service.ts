import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Account } from './model'
import { ActivityStorage, ReviewLike } from './model';
import { StorageService } from 'app/storage.service';
import * as CryptoJS from 'crypto-js';
import { environment } from 'environments/environment.prod';

@Injectable({
    providedIn: 'root',
})

export class AuthenticationService 
{
   private currentAccountSubject: BehaviorSubject<Account>;
   public remember: boolean = false;
   //private currentAccount: Observable<Account>;
   public activityStorage: ActivityStorage;

   private account_storage: string = StorageService.accountStorage;
   private activity_storage: string = StorageService.activityStorage;

   constructor() 
   {
       let account = localStorage.getItem(this.account_storage);
       if (account == null) 
       {
           account = sessionStorage.getItem(this.account_storage);
           this.remember = false;
       }
       else this.remember = true;
       
       let temp = null;
       if (account != null)
       {
           temp = JSON.parse(account)
           temp.roleName = CryptoJS.AES.decrypt(temp.roleName, environment.aes_key.trim()).toString(CryptoJS.enc.Utf8)
           console.log(temp.roleName)
       }

       this.currentAccountSubject = new BehaviorSubject<Account>(temp);

       //this.currentAccount = this.currentAccountSubject.asObservable();

       let activities = localStorage.getItem(this.activity_storage)? localStorage.getItem(this.activity_storage): sessionStorage.getItem(this.activity_storage);
       this.activityStorage = activities? JSON.parse(activities): {rateIds: [], movieLikeIds: [], reviewLikes: []};
   }
  
   public get currentAccountValue(): Account 
   {
        return this.currentAccountSubject.value;
   }
//    public get currentAccountAsSubject(): BehaviorSubject<Account>
//    {
//        return this.currentAccountSubject;
//    }
   public saveAccount(account: Account, remember: boolean, activities: ActivityStorage)
   {
       this.remember = remember;
       this.activityStorage = activities;

       this.setAccount(account);
       this.setActivityStorage();
       this.currentAccountSubject.next(account);
   }
   public logout()
   {
       if (this.remember)
       {
           localStorage.removeItem(this.account_storage);
           localStorage.removeItem(this.activity_storage);
           this.remember = false;
       }
       else 
       {
           sessionStorage.removeItem(this.account_storage); 
           sessionStorage.removeItem(this.activity_storage);
       }
       this.currentAccountSubject.next(null);
   }
   private setAccount(account: Account)
   {
        let temp = (JSON.parse(JSON.stringify(account)));
        temp.roleName = CryptoJS.AES.encrypt(temp.roleName, environment.aes_key.trim()).toString();
        if (this.remember) localStorage.setItem(this.account_storage, JSON.stringify(temp));
        else  sessionStorage.setItem(this.account_storage, JSON.stringify(temp));
   }
   private setActivityStorage()
   {
       if (this.remember) localStorage.setItem(this.activity_storage, JSON.stringify(this.activityStorage));
       else sessionStorage.setItem(this.activity_storage, JSON.stringify(this.activityStorage));
   }
   public updateLike(movieId: number, isAdded: boolean)
   {
       if (isAdded) this.activityStorage.movieLikeIds.push(movieId);
       else this.activityStorage.movieLikeIds = this.activityStorage.movieLikeIds.filter(m => m != movieId);
       this.setActivityStorage();      
   }

   public updateRate(movieId: number, isAdded: boolean)
   {
       if (isAdded) this.activityStorage.rateIds.push(movieId);
       else this.activityStorage.rateIds = this.activityStorage.rateIds.filter(m => m != movieId);
       this.setActivityStorage();
   }
   public updateReviewLike (reviewLike: ReviewLike)
   {
    let reviewLikeInStorage = this.activityStorage.reviewLikes.find(r => r.reviewId == reviewLike.reviewId);
    if (reviewLikeInStorage != null) 
    {
        if (!reviewLike.disLiked && !reviewLike.liked) this.activityStorage.reviewLikes = this.activityStorage.reviewLikes.filter(r => r.reviewId != reviewLike.reviewId)
        else reviewLikeInStorage = reviewLike;
    }
    else this.activityStorage.reviewLikes.push(reviewLike)
    this.setActivityStorage();
   }
   public isAuthenticated(): boolean 
   {
       if (this.currentAccountSubject.value) return true;
       return false; 
   }
   public updateProfilePic(base64: string)
   {
       let account = this.currentAccountSubject.value;
       account.user.image = base64;
       this.setAccount(account);
       this.currentAccountSubject.next(account);
   }
}