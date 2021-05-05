using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
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
    [Authorize(Roles = RolesHelper.SuperAdmin + "," + RolesHelper.Admin + "," + RolesHelper.Writer)]
    [Route("api/[controller]")]
    [ApiController]
    public class NotificationsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IHubContext<BroadcastService> _hubContext;
        private readonly IConnectionMapping<int> _connections;
        public NotificationsController(ApplicationDbContext context, IHubContext<BroadcastService> hubContext, IConnectionMapping<int> connectionMapping)
        {
            _context = context;
            _hubContext = hubContext;
            _connections = connectionMapping;
        }

        // GET: api/Notifications/5
        [HttpGet("{userId}")]
        public async Task<ActionResult<IEnumerable<NotificationVM>>> GetNotification(int userId)
        {
            return await _context.Notifications.Where(n => n.ReceiverId == userId && !n.IsViewed)
                                               .Include(n => n.Sender).ThenInclude(a => a.User)
                                               .Select(n => new NotificationVM() { Id = n.Id, Message = n.Message, CreatedDate = n.CreatedDate, Url = n.Url, SenderImage = n.Sender.User.Image, SenderName = n.Sender.UserName })
                                               .ToListAsync();
        }

        // GET: api/Notifications/View/5
        [HttpGet("View/{id}")]
        public async Task<IActionResult> ViewNotification(int id)
        {
            var notification = await _context.Notifications.Where(n => n.Id == id && !n.IsViewed).FirstOrDefaultAsync();
            if (notification != null)
            {
                notification.IsViewed = true;
                await _context.SaveChangesAsync();
                SendMessage(id, notification.ReceiverId);
            }
            return NoContent();
        }

        // GET: api/Notifications - User đánh dấu tất cả các notification đag đc hiển thị là đã đọc -> navbar-writer, navbar
        [HttpPost]
        public async Task<IActionResult> ViewAllNotifications(List<int> ids)
        {
            var notifications = await _context.Notifications.Where(n => ids.Contains(n.Id) && !n.IsViewed).ToListAsync();
            if (notifications.Count > 0)
            {
                notifications.ForEach(notification => { notification.IsViewed = true; });
                await _context.SaveChangesAsync();
                SendMessages(notifications.Select(n => n.Id).ToList(), notifications.First().ReceiverId);
            }    
            return NoContent();
        }

        public void SendMessage(int notificationId, int receiver)
        {
            List<string> receiverConnectionids = _connections.GetConnections(receiver).ToList();
            if (receiverConnectionids.Count() > 0)
            {
                try
                {
                    _hubContext.Clients.Clients(receiverConnectionids).SendAsync("ReadMessage", notificationId).Wait();
                }
                catch (Exception) { }
            }
        }
        public void SendMessages(List<int> ids, int receiver)
        {
            List<string> receiverConnectionids = _connections.GetConnections(receiver).ToList();
            if (receiverConnectionids.Count() > 0)
            {
                try
                {
                    _hubContext.Clients.Clients(receiverConnectionids).SendAsync("ReadMessages", ids).Wait();
                }
                catch (Exception) { }
            }
        }
    }
}
