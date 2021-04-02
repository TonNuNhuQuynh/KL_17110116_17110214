import { Injectable } from "@angular/core";

@Injectable({ providedIn: 'root'})
export class TaskService {
    
    public static unAssignedT: number = 0
    public static waitingT: number = 1
    public static processingT: number = 2
    public static unApprovedT: number = 3
    public static approvedT: number = 4
    public static timeUpT: number = 5
    public static overdueT: number = 6
    constructor() {}

}