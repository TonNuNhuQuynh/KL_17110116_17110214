import { Injectable } from "@angular/core";

@Injectable({ providedIn: 'root'})
export class ApiService {
    
    public api_key: string = "";
    // public backendHost: string = "https://www.tlcn-moviereviews.somee.com"
    // public cinemaChainHost: string = "https://tlcn-cinemachain.somee.com";
    public backendHost: string = "https://localhost:44320"
    public cinemaChainHost: string = "https://localhost:44302";
    public frontEndHost_User: string = "http://localhost:5000/#"
    constructor() {}

}