import { Injectable } from "@angular/core";

@Injectable({ providedIn: 'root'})
export class ApiService {
    
    public api_key: string = "bd86c74b5568da4a7cf8fb52e1cd755e";
    public backendHost: string = "https://localhost:44320"
    public cinemaChainHost: string = "https://localhost:44302"
    public frontEndHost_Admin: string = "http://localhost:4200/#"
    public frontEndHost_User: string = "http://localhost:5000/#"

    // public backendHost: string = "https://tlcn-moviereviews.somee.com"
    // public cinemaChainHost: string = "https://tlcn-cinemachain.somee.com"
    // public frontEndHost_Admin: string = "https://admin-moviefy.web.app/#"
    // public frontEndHost_User: string = "https://movie-reviews-and-tickets.web.app/#"
    
    constructor() {}

}