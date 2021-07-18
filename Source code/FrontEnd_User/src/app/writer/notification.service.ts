import { Injectable } from "@angular/core";
import { Subject } from "rxjs";
import { Notification } from './model'
import * as signalR from '@microsoft/signalr';
import { ApiService } from "app/api.service";

type NotifyAction = {isViewed: boolean, notification: Notification, id: number};

@Injectable({ providedIn: 'root'})
export class NotificationService {

    private connection: signalR.HubConnection
    public notiCount: number = 0
    public notifySubject = new Subject<NotifyAction>()
    
    public connected: boolean = false
    public connectedSubject = new Subject<boolean>()

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
        let _this = this
        this.connection.start().then(function () {  
            _this.connected = true
            _this.connectedSubject.next(true)
            console.log('SignalR Connected!');  
        }).catch(function (err) {  return console.error(err.toString()); })  
      
        this.connection.on('ReceiveMessage', (noti: Notification) => {
            this.notifySubject.next({isViewed: false, notification: noti, id: 0})
        });

        this.connection.on('ReadMessage', (id: number) => {
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