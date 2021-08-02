using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using MovieReviewsAndTickets_API.Helpers;
using MovieReviewsAndTickets_API.Models;
using MovieReviewsAndTickets_API.Services;
using MovieReviewsAndTickets_API.Services.SignalR;
using MovieReviewsAndTickets_API.ViewModels;

namespace MovieReviewsAndTickets_API.Controllers
{
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    [Route("api/[controller]")]
    [ApiController]
    public class FeedbacksController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IHubContext<BroadcastService> _hubContext;
        private readonly IConnectionMapping<int> _connections;
        public FeedbacksController(ApplicationDbContext context, IHubContext<BroadcastService> hubContext, IConnectionMapping<int> connectionMapping)
        {
            _context = context;
            _hubContext = hubContext;
            _connections = connectionMapping;
        }

        // GET: api/Feedbacks/{postId} - Lấy feedback từ admin cho post -> post-review (Admin vs Writer)
        [Authorize(Roles = RolesHelper.SuperAdmin + "," + RolesHelper.Admin + "," + RolesHelper.Writer)]
        [HttpGet("{postId}")]
        public async Task<ActionResult<IEnumerable<object>>> GetFeedbacksOfPost(int postId)
        {
            return await _context.Feedbacks.Where(f => f.PostId == postId)
                                           .Include(f => f.Account).ThenInclude(a => a.User)
                                           .Select(f => new { Content = f.Content, CreatedDate = f.CreatedDate, Username = f.Account.UserName, Image = f.Account.User.Image })
                                           .ToListAsync();
        }


        // POST: api/Feedbacks - Admin post feedback -> post-review (Admin)
        [Authorize(Roles = RolesHelper.SuperAdmin + "," + RolesHelper.Admin)]
        [HttpPost]
        public async Task<ActionResult<Feedback>> PostFeedback(FeedbackVM feedbackVM)
        {
            feedbackVM.Feedback.CreatedDate = HostingTimeZone.Now;
            _context.Feedbacks.Add(feedbackVM.Feedback);
            var sender = await _context.Accounts.Where(a => a.Id == feedbackVM.Feedback.AccountId).Include(a => a.User).FirstOrDefaultAsync();
            Notification notification = new Notification() { ReceiverId = feedbackVM.ReceiverId, CreatedDate = HostingTimeZone.Now, SenderId = feedbackVM.Feedback.AccountId };
            (notification.Message, notification.Url) = NotificationHelper.FeedbackPostNoti(sender.UserName, feedbackVM.Feedback.PostId);
            _context.Notifications.Add(notification);
            await _context.SaveChangesAsync();
            SendMessage(new NotificationVM() { Id = notification.Id, Url = notification.Url, CreatedDate = notification.CreatedDate, Message = notification.Message, SenderImage = sender.User.Image, SenderName = sender.UserName }, notification.ReceiverId);
            return feedbackVM.Feedback;
        }
        public void SendMessage(NotificationVM notification, int receiver)
        {
            //Receive Message
            List<string> receiverConnectionids = _connections.GetConnections(receiver).ToList();
            if (receiverConnectionids.Count() > 0)
            {
                //Save-Receive-Message
                try
                {
                    _hubContext.Clients.Clients(receiverConnectionids).SendAsync("ReceiveMessage", notification).Wait();
                }
                catch (Exception) { }
            }
        }
    }
    public class FeedbackVM
    {
        public Feedback Feedback { get; set; }
        public int ReceiverId { get; set; }
    }
}
