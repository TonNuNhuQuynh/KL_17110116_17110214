import { Injectable } from "@angular/core";

@Injectable({ providedIn: 'root'})
export class StorageService  
{
    public static accountStorage: string = 'currentAccount';
    public static activityStorage: string = 'activities';
    public static pickedCityStorage: string = 'currentCity'
    public static bookingInfo: string = 'booking';
    public static callbackUrl: string = 'callback';
    public static countdown: string = 'endcount';
    public static selectedSeats: string = 'selectedSeats';
    public static orderTotal: string = 'total';
    public static token: string = 't';
    public static id: string = 'i';
    public static role: string = 'r';
    
    constructor() { }
    
}