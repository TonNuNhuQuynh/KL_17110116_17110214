import { Injectable } from "@angular/core";
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from "@angular/router";
import { AuthenticationService } from "./authentication.service";

@Injectable()
export class RoleGuardService implements CanActivate {
  constructor(public auth: AuthenticationService, public router: Router) {}
  public redirectUrl: string;
  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean 
  {
    const expectedRoles: string[] = route.data.expectedRoles;
    const account = this.auth.currentAccountValue;
    this.redirectUrl = state.url;
    
    if (!this.auth.isAuthenticated())
    {
      this.router.navigate(['login'], { state: {callbackUrl: this.redirectUrl} });
      return false;
    } 
    if (expectedRoles.indexOf(account.roleName) == -1) return false;
    return true;
  }
}