import { Injectable } from "@angular/core";

@Injectable({ providedIn: 'root'})
export class PostServive {
    
    public static processingP: number = 0
    public static sentP: number = 1
    public static publishedP: number = 2
    public static deletedP: number = 3
    constructor() {}

}