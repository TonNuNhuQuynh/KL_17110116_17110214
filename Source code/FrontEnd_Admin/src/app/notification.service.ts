import { Injectable } from "@angular/core";
import { Subject } from "rxjs";
import * as signalR from '@microsoft/signalr';
import { ApiService } from "app/api.service";

type NotifyAction = {isViewed: boolean, notification: Notification, id: number};

@Injectable({ providedIn: 'root'})
export class NotificationService {

    private connection: signalR.HubConnection;
    public notiCount: number = 0;
    public notifySubject = new Subject<NotifyAction>();

    constructor(private apiService: ApiService) {}

    public connect(userId: number)
    {
        if (!this.connection)
        {
            this.connection = new signalR.HubConnectionBuilder()
                                .configureLogging(signalR.LogLevel.Information) 
                                .withUrl(this.apiService.backendHost + `/notify?user=${userId}`)  
                                .withAutomaticReconnect()
                                .configureLogging(signalR.LogLevel.Debug)
                                .build();
        }
        this.connection.start().then(function () {  
            console.log('SignalR Connected!');  
        }).catch(function (err) {  return console.error(err.toString()); });  
      
        this.connection.on('ReceiveMessage', (noti: Notification) => {
            this.notifySubject.next({isViewed: false, notification: noti, id: 0})
        });

        this.connection.on('ReadMessage', (id: number) => {
            console.log(id);  
            this.notifySubject.next({isViewed: true, notification: null, id: id})
        });

        this.connection.on('ReadMessages', (ids: number[]) => {
            ids.forEach(id => {
                this.notifySubject.next({isViewed: true, notification: null, id: id})
            })
        });
    }

    public disconnect()
    {
        if (this.connection) 
        {
            this.connection.stop()
            this.connection = null
        }
    }

}
export class Notification
{
    id: number;
    message: string;
    url: string;
    createdDate: Date;
    senderImage: string;
    senderName: string;
}