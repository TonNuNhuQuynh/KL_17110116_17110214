import { Injectable } from "@angular/core";
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from "@angular/router";
import { StorageService } from "app/storage.service";


@Injectable()
export class BookingGuardService implements CanActivate 
{
    constructor(public router: Router) {}
    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean  
    {
        if (sessionStorage.getItem(StorageService.bookingInfo) == null) 
        {
            this.router.navigate(['/not-found'])
            return false;
        }
        return true;
    }

}