using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MovieReviewsAndTickets_API.Helpers;
using MovieReviewsAndTickets_API.Models;
using MovieReviewsAndTickets_API.Services;
using MovieReviewsAndTickets_API.ViewModels;
using Newtonsoft.Json;
using Twilio;
using Twilio.Rest.Api.V2010.Account;
using Twilio.Types;

namespace MovieReviewsAndTickets_API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class OrdersController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private IEmailSender _emailSender;
        const string AccountSid = "";
        const string AuthToken = "";
        const string PhoneNo = "";
        public OrdersController(ApplicationDbContext context, IEmailSender emailSender)
        {
            _context = context;
            _emailSender = emailSender;
        }

        // GET: api/Orders
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Order>>> GetOrders()
        {
            return await _context.Orders.ToListAsync();
        }

        // GET: api/Orders/5 - Lấy order của accountId -> watchlist
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
        [Authorize(Roles = RolesHelper.Writer + "," + RolesHelper.User)]
        [HttpGet("{accountId}")]
        public async Task<ActionResult<IEnumerable<object>>> GetOrder(int accountId)
        {
            var orders = await _context.Orders.Where(o => o.AccountId == accountId).Include(o => o.Movie).Include(o => o.SeatsInOrders).Include(o => o.Cinema).ToListAsync();
            return orders.Select(o => new { Id = o.MovieId, Title = o.Movie.Title, Poster = o.Movie.Poster, AgeRating = o.Movie.AgeRating, Runtime = o.Movie.Runtime, OriginalTitle = o.Movie.OriginalTitle, CinemaName = o.Cinema.Name, StartDate = o.Showtime, RoomName = o.RoomName, Seats = o.SeatsInOrders.Select(s => s.SeatCode).ToList(), Total = o.Total }).ToList();
        }

        // POST: api/Orders - Post payment request và charge tiền vé - booking
        [HttpPost]
        public async Task<IActionResult> PostOrder(PaymentRequest paymentRequest)
        {
            // Tạo order gửi qua cinema API
            OrderVM receivedOrder = paymentRequest.Order;
            var cinemaChainOrder = new {
                                         Id = receivedOrder.Id,
                                         Name = receivedOrder.Name,
                                         Phone = receivedOrder.Phone,
                                         Email = receivedOrder.Email,
                                         ShowtimeId = receivedOrder.ShowtimeId,
                                         Total = receivedOrder.Total,
                                         CreatedDate = DateTime.Now,
                                         SeatsInOrders = receivedOrder.SeatsInOrderVMs };

            var newPaymentRequest = new { Order = cinemaChainOrder, Token = paymentRequest.Token };
            var jsonString = JsonConvert.SerializeObject(newPaymentRequest);
            int orderId;

            using (var httpClient = new HttpClient())
            {
                using (var response = await httpClient.PostAsync(ApiHelper.CinemaChainHost + $"/api/Orders", new StringContent(jsonString, Encoding.UTF8, "application/json")))
                {
                    // Lỗi ghế đã được chọ
                    //if (!response.IsSuccessStatusCode) return NotFound();
                    string apiResponse = await response.Content.ReadAsStringAsync();
                    // Lỗi thẻ không hợp lệ
                    if (apiResponse == "Invalid seats") return NotFound();
                    if (apiResponse == "Invalid card") return new JsonResult(apiResponse);
                    orderId = Convert.ToInt32(apiResponse);
                }
            }

            //Lưu order xuống nếu có accountId
            if (paymentRequest.Order.AccountId != 0)
            {
                List<SeatsInOrder> seatsInOrders = new List<SeatsInOrder>();
                foreach (var seat in receivedOrder.SeatsInOrderVMs)
                {
                    SeatsInOrder seatsInOrder = new SeatsInOrder() { OrderId = receivedOrder.Id, SeatId = seat.SeatId, SeatCode = seat.Code };
                    seatsInOrders.Add(seatsInOrder);
                }
                Order order = new Order()
                {
                    Id = 0,
                    Total = receivedOrder.Total,
                    Showtime = receivedOrder.Showtime,
                    RoomName = receivedOrder.RoomName,
                    CreatedDate = DateTime.Now,
                    CinemaId = receivedOrder.CinemaId,
                    MovieId = receivedOrder.MovieId,
                    SeatsInOrders = seatsInOrders,
                    AccountId = receivedOrder.AccountId,
                };
                _context.Orders.Add(order);
                await _context.SaveChangesAsync();
            }

            //Gửi email cho user
            var movie = await _context.Movies.Where(m => m.Id == receivedOrder.MovieId).FirstOrDefaultAsync();
            try
            {
                await this._emailSender.SendEmailAsync(receivedOrder.Email, "Mua vé thành công", $"Xin chào {receivedOrder.Name}, <br>" +
                        $"Bạn đã đặt mua vé thành công cho phim {movie.Title}! Hãy đưa mã này cho nhân viên quầy vé tại rạp <strong>{receivedOrder.CinemaName}</strong> để đổi vé của bạn: <strong>{orderId}</strong>." +
                        $"<br>Suất chiếu: {receivedOrder.Showtime.ToString("dd/MM/yyyy HH:mm")}" +
                        $"<br>Phòng chiếu: {receivedOrder.RoomName}" +
                        $"<br>Ghế đã mua: {string.Join(", ", receivedOrder.SeatsInOrderVMs.Select(s => s.Code).ToArray())}" +
                        $"<br>Thành tiền: {receivedOrder.Total} đ" +
                        "<br>Cảm ơn bạn đã đặt vé tại website của chúng tôi!");
            }
            catch (Exception) { }

            //Gửi sms cho số điện thoại user
            try
            {
                TwilioClient.Init(AccountSid, AuthToken);
                var to = new PhoneNumber("+84" + receivedOrder.Phone);
                var message = MessageResource.Create(
                    to,
                    from: new PhoneNumber(PhoneNo), // From number, must be an SMS-enabled Twilio number ( This will send sms from ur "To" numbers ).  
                    body: $"Bạn đã mua vé thành công cho phim {movie.Title}, suất chiếu lúc {receivedOrder.Showtime.ToString("dd/MM/yyyy HH:mm")} tại rạp {receivedOrder.CinemaName}. Mã đơn hàng: {orderId}, thành tiền: {receivedOrder.Total} đ.");
            }
            catch (Exception e)
            {
                Console.WriteLine(e.Message);
            }

            return new JsonResult(orderId);
        }

        // DELETE: api/Orders/5
        [HttpDelete("{id}")]
        public async Task<ActionResult<Order>> DeleteOrder(int id)
        {
            var order = await _context.Orders.FindAsync(id);
            if (order == null) return NotFound();
            _context.Orders.Remove(order);
            await _context.SaveChangesAsync();
            return order;
        }

        // POST: api/Orders/Paypal - Post payment request của Paypal và charge tiền vé - booking
        [HttpPost("Paypal")]
        public async Task<IActionResult> ExecuteOrder([FromForm] PaypalPaymentRequest paymentRequest)
        {
            paymentRequest.Order = JsonConvert.DeserializeObject<OrderVM>(HttpContext.Request.Form["order"]);
            var cinemaChainOrder = new
            {
                Id = paymentRequest.Order.Id,
                Name = paymentRequest.Order.Name,
                Phone = paymentRequest.Order.Phone,
                Email = paymentRequest.Order.Email,
                ShowtimeId = paymentRequest.Order.ShowtimeId,
                Total = paymentRequest.Order.Total,
                CreatedDate = DateTime.Now,
                SeatsInOrders = paymentRequest.Order.SeatsInOrderVMs
            };

            var newPaymentRequest = new { Order = cinemaChainOrder, PaymentId = paymentRequest.PaymentId, PayerId = paymentRequest.PayerId };
            var jsonString = JsonConvert.SerializeObject(newPaymentRequest);
            int orderId;

            using (var httpClient = new HttpClient())
            {
                using (var response = await httpClient.PostAsync(ApiHelper.CinemaChainHost + $"/api/Orders/Paypal", new StringContent(jsonString, Encoding.UTF8, "application/json")))
                {
                    string apiResponse = await response.Content.ReadAsStringAsync();
                    // Lỗi ghế đã được chọn or thẻ k hợp lệ
                    if (apiResponse == "Invalid seats" || apiResponse == "Invalid card") return new JsonResult(apiResponse);
                    orderId = Convert.ToInt32(apiResponse);
                }
            }

            //Lưu order xuống nếu có accountId
            if (paymentRequest.Order.AccountId != 0)
            {
                List<SeatsInOrder> seatsInOrders = new List<SeatsInOrder>();
                foreach (var seat in paymentRequest.Order.SeatsInOrderVMs)
                {
                    SeatsInOrder seatsInOrder = new SeatsInOrder() { OrderId = paymentRequest.Order.Id, SeatId = seat.SeatId, SeatCode = seat.Code };
                    seatsInOrders.Add(seatsInOrder);
                }
                Order order = new Order()
                {
                    Id = 0,
                    Total = paymentRequest.Order.Total,
                    Showtime = paymentRequest.Order.Showtime,
                    RoomName = paymentRequest.Order.RoomName,
                    CreatedDate = DateTime.Now,
                    CinemaId = paymentRequest.Order.CinemaId,
                    MovieId = paymentRequest.Order.MovieId,
                    SeatsInOrders = seatsInOrders,
                    AccountId = paymentRequest.Order.AccountId,
                };
                _context.Orders.Add(order);
                await _context.SaveChangesAsync();
            }

            //Gửi email cho user
            var movie = await _context.Movies.Where(m => m.Id == paymentRequest.Order.MovieId).FirstOrDefaultAsync();
            try
            {
                await this._emailSender.SendEmailAsync(paymentRequest.Order.Email, "Mua vé thành công", $"Xin chào {paymentRequest.Order.Name}, <br>" +
                        $"Bạn đã đặt mua vé thành công cho phim {movie.Title}! Hãy đưa mã này cho nhân viên quầy vé tại rạp <strong>{paymentRequest.Order.CinemaName}</strong> để đổi vé của bạn: <strong>{orderId}</strong>." +
                        $"<br>Suất chiếu: {paymentRequest.Order.Showtime.ToString("dd/MM/yyyy HH:mm")}" +
                        $"<br>Phòng chiếu: {paymentRequest.Order.RoomName}" +
                        $"<br>Ghế đã mua: {string.Join(", ", paymentRequest.Order.SeatsInOrderVMs.Select(s => s.Code).ToArray())}" +
                        $"<br>Thành tiền: {paymentRequest.Order.Total} đ" +
                        "<br>Cảm ơn bạn đã đặt vé tại website của chúng tôi!");
            }
            catch (Exception) { }

            //Gửi sms cho số điện thoại user
            try
            {
                TwilioClient.Init(AccountSid, AuthToken);
                var to = new PhoneNumber("+84" + paymentRequest.Order.Phone);
                var message = MessageResource.Create(
                    to,
                    from: new PhoneNumber(PhoneNo), // From number, must be an SMS-enabled Twilio number ( This will send sms from ur "To" numbers ).  
                    body: $"Bạn đã mua vé thành công cho phim {movie.Title}, suất chiếu lúc {paymentRequest.Order.Showtime.ToString("dd/MM/yyyy HH:mm")} tại rạp {paymentRequest.Order.CinemaName}. Mã đơn hàng: {orderId}, thành tiền: {paymentRequest.Order.Total} đ");
            }
            catch (Exception e)
            {
                Console.WriteLine(e.Message);
            }

            return new JsonResult(orderId);
        }

    }

    public class PaymentRequest
    {
        public OrderVM Order { get; set; }
        public string Token { get; set; }
    }
    public class PaypalPaymentRequest
    {
        public OrderVM Order { get; set; }
        public string PaymentId { get; set; }
        public string PayerId { get; set; }
    }
}
