using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PayPal.Api;
using WebAPI.Models;


namespace WebAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class OrdersController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private Dictionary<string, string> configurationMap;
        public OrdersController(ApplicationDbContext context)
        {
            _context = context;
            configurationMap = new Dictionary<string, string>();
            configurationMap.Add("clientId", "");
            configurationMap.Add("clientSecret", "");
            configurationMap.Add("mode", "sandbox");
        }


        // POST: api/Orders -> OrdersController của Main backend
        //[HttpPost]
        //public async Task<IActionResult> PostOrder(PaymentRequest paymentRequest)
        //{
        //    // Id của các ghế muốn thanh toán
        //    List<int> seatIds = paymentRequest.Order.SeatsInOrders.Select(s => s.SeatId).ToList();
        //    // Lấy Id các ghế đã được thanh toán của suất chiếu
        //    var orderIds = await _context.Orders.Where(o => o.ShowtimeId == paymentRequest.Order.ShowtimeId).Select(o => o.Id).ToListAsync();
        //    var paidSeatIds = await _context.SeatsInOrders.Where(s => orderIds.Contains(s.OrderId)).Select(s => s.SeatId).ToListAsync();
        //    List<int> unavailables = seatIds.Where(s => paidSeatIds.IndexOf(s) > -1).ToList();

        //    //Nếu 1 trong số các ghế đã đc chọn trước
        //    if (unavailables.Count > 0) return Content("Invalid seats");
        //    else
        //    {
        //        var showtime = await _context.Showtimes
        //                             .Where(s => s.Id == paymentRequest.Order.ShowtimeId)
        //                             .Include(s => s.Cinema).ThenInclude(s => s.CinemaChain).ThenInclude(c => c.CheckoutInfo).FirstOrDefaultAsync();
        //        // Charge order
        //        StripeConfiguration.ApiKey = showtime.Cinema.CinemaChain.CheckoutInfo.PrivateKey;
        //        var myCharge = new ChargeCreateOptions();
        //        myCharge.Source = paymentRequest.Token;
        //        myCharge.Amount = (long)paymentRequest.Order.Total;
        //        myCharge.Currency = "vnd";
        //        myCharge.Description = "Booking tickets";
        //        myCharge.Metadata = new Dictionary<string, string>();
        //        myCharge.Metadata["OurRef"] = "OurRef-" + Guid.NewGuid().ToString();

        //        try
        //        {
        //            var chargeService = new ChargeService();
        //            Charge stripeCharge = chargeService.Create(myCharge);
        //            if (stripeCharge.Status == "failed") return Content("Invalid card");
        //            // Thêm order vào database
        //            paymentRequest.Order.CreatedDate = DateTime.Now;
        //            _context.Orders.Add(paymentRequest.Order);
        //            await _context.SaveChangesAsync();
        //            return Content(paymentRequest.Order.Id.ToString());
        //        }
        //        catch (Exception e)
        //        {
        //            return Content("Invalid card");
        //        }
        //    }
        //}

        // OrdersController của Main backend
        [HttpPost("Paypal")] 
        public async Task<IActionResult> ExecutePaypalOrder(PaypalPaymentRequest paymentRequest)
        {
            // Id của các ghế muốn thanh toán
            List<int> seatIds = paymentRequest.Order.SeatsInOrders.Select(s => s.SeatId).ToList();
            // Lấy Id các ghế đã được thanh toán của suất chiếu
            var orderIds = await _context.Orders.Where(o => o.ShowtimeId == paymentRequest.Order.ShowtimeId).Select(o => o.Id).ToListAsync();
            var paidSeatIds = await _context.SeatsInOrders.Where(s => orderIds.Contains(s.OrderId)).Select(s => s.SeatId).ToListAsync();
            List<int> unavailables = seatIds.Where(s => paidSeatIds.IndexOf(s) > -1).ToList();

            //Nếu 1 trong số các ghế đã đc chọn trước
            if (unavailables.Count > 0) return Content("Invalid seats");
            else
            {
                var showtime = await _context.Showtimes
                                    .Where(s => s.Id == paymentRequest.Order.ShowtimeId)
                                    .Include(s => s.Cinema).ThenInclude(s => s.CinemaChain).ThenInclude(c => c.CheckoutInfo).FirstOrDefaultAsync();
                if (!ExecutePaypalPayment(paymentRequest.PayerId, paymentRequest.PaymentId, showtime.Cinema.CinemaChain.CheckoutInfo.PublicKey, showtime.Cinema.CinemaChain.CheckoutInfo.PrivateKey)) return Content("Invalid card");
                // Thêm order vào database
                paymentRequest.Order.CreatedDate = DateTime.Now;
                _context.Orders.Add(paymentRequest.Order);
                await _context.SaveChangesAsync();
                return Content(paymentRequest.Order.Id.ToString());
            }
            
        }
        public bool ExecutePaypalPayment(string payerId, string paymentId, string clientId, string secretKey)
        {
            configurationMap["clientId"] = clientId;
            configurationMap["clientSecret"] = secretKey;
            var accessToken = new OAuthTokenCredential(clientId, secretKey, configurationMap).GetAccessToken();
            var apiContext = new APIContext(accessToken) { Config = configurationMap };
            var paymentExecution = new PaymentExecution() { payer_id = payerId };
            var payment = new Payment() { id = paymentId };
            var executedPayment = payment.Execute(apiContext, paymentExecution);
            if (executedPayment.state.ToLower() != "approved") return false;
            return true;
        }
    }
    public class PaymentRequest
    {
        public Models.Order Order { get; set; }
        public string Token { get; set; }
    }
    public class PaypalPaymentRequest
    {
        public Models.Order Order { get; set; }
        public string PayerId { get; set; }
        public string PaymentId { get; set; }
    }
}
