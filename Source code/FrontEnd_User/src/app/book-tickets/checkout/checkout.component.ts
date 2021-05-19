import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, EventEmitter, OnInit, Output, AfterContentChecked, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ApiService } from 'app/api.service';
import { AuthenticationService } from 'app/authentication/authentication.service';
import { LoginModalComponent } from 'app/shared/login-modal/login-modal.component';
import { ToastService } from 'app/toast/toast.service';
import { ErrorModalComponent } from '../error-modal/error-modal.component';
import { BookingInfo, RoomVM, SelectedSeat } from '../model';
import { Order, OrderDetails, SeatsInOrder } from './model';
declare var paypal: any;

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.css']
})
export class CheckoutComponent implements OnInit, AfterContentChecked, AfterViewInit {

  constructor(private modalService: NgbModal, private router: Router, private chRef: ChangeDetectorRef, private toast: ToastService, private auth: AuthenticationService, private apiService: ApiService, private http: HttpClient) 
  { }

  ngAfterContentChecked(): void 
  {
    this.chRef.detectChanges();
  }
  
  bookingInfo: BookingInfo = {movieId: 0, movieName: '', cinemaAddr: '', cinemaName: '', cinemaId: 0, showtimeId: 0, startDate: null, email: '', name: '', phone: '', orderId: 0}
  roomInfo: RoomVM
  selectedSeats: SelectedSeat[]
  total: number = 0
  summary: OrderDetails[] = []
  redirectUrl: string
  loading: boolean = false
  @Output() bookingInfoChanged: EventEmitter<BookingInfo> = new EventEmitter()
  @Output() pauseChanged: EventEmitter<boolean> = new EventEmitter()

  public payPalConfig?: any
  usd: number = 0.000043

  ngOnInit(): void 
  {
    this.initSummary()
    this.initConfig()
  }
  initSummary()
  {
    this.roomInfo.seatTypes.forEach(element => {
      let seats = this.selectedSeats.filter(s => s.seatTypeId == element.id);
      if (seats.length > 0) this.summary.push({seatTypeName: element.name, quantity: seats.length, amount: seats[0].price*seats.length})
    });

  }
  // postOrder(token: any)
  // {
  //   let seatsInOrder: SeatsInOrder[] = [];
  //   this.selectedSeats.forEach(element => {
  //     seatsInOrder.push({orderId: 0, seatId: element.id, price: element.price, code: element.code})
  //   });

  //   let order: Order = 
  //   {
  //     id: 0, 
  //     total: this.total, 
  //     showtime: this.bookingInfo.startDate, 
  //     roomName: this.roomInfo.name,
  //     createdDate: new Date(),
  //     accountId: this.auth.currentAccountValue == null? 0: this.auth.currentAccountValue.id,
  //     movieId: this.bookingInfo.movieId,
  //     cinemaId: this.bookingInfo.cinemaId,
  //     showtimeId: this.bookingInfo.showtimeId,
  //     seatsInOrderVMs: seatsInOrder,
  //     name: this.bookingInfo.name,
  //     email: this.bookingInfo.email,
  //     phone: this.bookingInfo.phone,
  //     cinemaName: this.bookingInfo.cinemaName
  //   }

  //   let url = this.apiService.backendHost + '/api/Orders';
  //   this.http.post(url, {order: order, token: token.id}).toPromise().then(res => {
  //     if (res == "Invalid card") this.toast.toastError("Thông tin thẻ không hợp lệ!");
  //     else 
  //     {
  //       this.bookingInfo.orderId = Number(res);
  //       this.bookingInfoChanged.emit(this.bookingInfo);
  //       this.router.navigate(['/booking/done'])
  //     }
  //     this.loading = false;
  //   })
  //   .catch( err => { 
  //     this.loading = false;
  //     this.openError() 
  //   });
  // }

  // openCheckout(tokenCallback: any) 
  // {
  //   let handler = (<any>window).StripeCheckout.configure({
  //     key: this.roomInfo.checkoutKey,
  //     locale: "auto",
  //     token: tokenCallback
  //   });

  //   handler.open({
  //     name: "Movie reviews and tickets",
  //     description: this.bookingInfo.movieName,
  //     zipCode: false,
  //     currency: "vnd",
  //     amount: this.total,
  //     panelLabel: "Pay {{amount}}",
  //     allowRememberMe: true,
  //     email: this.bookingInfo.email
  //   });
  // }
  // checkout()
  // {
  //   this.openCheckout((token: any) => {
  //     this.loading = true
  //     this.postOrder(token)
  //   })

  // }
  openError()
  {
    const modalRef = this.modalService.open(ErrorModalComponent, {backdrop: 'static', keyboard: false});
    modalRef.componentInstance.message = 'Đã xảy ra lỗi. Hãy thực hiện lại đơn hàng của bạn';
    modalRef.componentInstance.redirectUrl = this.redirectUrl;
    modalRef.result.then((result: string) => {}, (reason: any) => {})
  }
  openLoginModal()
  {
    const modalRef = this.modalService.open(LoginModalComponent, {windowClass: "login"});

    modalRef.result.then(async (result: any) => {}, (reason: any) => {})
  }
  
  createOrder(): Order
  {
    let seatsInOrder: SeatsInOrder[] = [];
    this.selectedSeats.forEach(element => {
      seatsInOrder.push({orderId: 0, seatId: element.id, price: element.price, code: element.code})
    });
    return {
      id: 0, 
      total: this.total, 
      showtime: this.bookingInfo.startDate, 
      roomName: this.roomInfo.name,
      createdDate: new Date(),
      accountId: this.auth.currentAccountValue == null? 0: this.auth.currentAccountValue.id,
      movieId: this.bookingInfo.movieId,
      cinemaId: this.bookingInfo.cinemaId,
      showtimeId: this.bookingInfo.showtimeId,
      seatsInOrderVMs: seatsInOrder,
      name: this.bookingInfo.name,
      email: this.bookingInfo.email,
      phone: this.bookingInfo.phone,
      cinemaName: this.bookingInfo.cinemaName
    }
  }

  ngAfterViewInit(): void 
  {
    paypal.Button.render(this.payPalConfig, '#paypal-button')
  }

  private initConfig(): void {
    let _this = this
    this.payPalConfig = {
      env: 'sandbox', 
      client: { sandbox: this.roomInfo.checkoutKey, production: '' },
      locale: 'en_US',
      style: {
        size: 'responsive',
        color: 'gold',
        shape: 'rect',
        layout: 'vertical'
      },
      funding: {
        allowed: [ paypal.FUNDING.CARD ],
        disallowed: [ paypal.FUNDING.CREDIT ]
      },
      commit: true,
      payment: function(data, actions) {
        return actions.payment.create({
          payment: {
            transactions: [
              { amount: { total: `${(_this.usd*_this.total).toFixed(2)}`, currency: 'USD' } }
            ]
          },
          experience: { input_fields: { no_shipping: 1 } }
        });
      },
      onAuthorize: function(data, actions) {       
        _this.pauseChanged.emit(true)
        _this.loading = true
        return actions.request.post(_this.apiService.backendHost + '/api/Orders/Paypal', { order: JSON.stringify(_this.createOrder()), payerId: data.payerID, paymentID: data.paymentID }, {headers: {'Content-Type': 'application/x-www-form-urlencoded'} })
        .then(function(res) 
        {
          if (res == "Invalid card") _this.toast.toastError("Thông tin thẻ không hợp lệ!");
          else 
          {
            _this.bookingInfo.orderId = Number(res);
            _this.bookingInfoChanged.emit(_this.bookingInfo);
            _this.router.navigate(['/booking/done'])
          }
          _this.loading = false;
        })
      },
      onCancel: function(e) { },
      onError: function(e) { console.log(e) }
    }
  }
}
