using Microsoft.AspNetCore.SignalR;
using System;
using MovieReviewsAndTickets_API.Services.SignalR;
using System.Threading.Tasks;

namespace MovieReviewsAndTickets_API.Services
{
    public class BroadcastService: Hub
    {
        //private readonly static ConnectionMapping<int> _connections = new ConnectionMapping<int>();
        private readonly IConnectionMapping<int> _connections;
        //private readonly ApplicationDbContext _context;
        public BroadcastService(IConnectionMapping<int> connectionMapping)
        {
            _connections = connectionMapping;
            //_context = context;
        }

        public override Task OnConnectedAsync()
        {
            var httpContext = Context.GetHttpContext();
            if (httpContext != null)
            {
                try
                {
                    int userId = Convert.ToInt32(httpContext.Request.Query["user"]);
                    var connId = Context.ConnectionId.ToString();
                    _connections.Add(userId, connId);
                    //var notifications = await _context.Notifications.Where(n => n.AccountId == userId && !n.IsViewed).ToListAsync();
                    //await Clients.Clients(connId).SendAsync("NotificationCounts", notifications.Count);
                }
                catch (Exception) { }
            }
            return base.OnConnectedAsync();
        }

        public override Task OnDisconnectedAsync(Exception exception)
        {
            var httpContext = Context.GetHttpContext();
            if (httpContext != null)
            {
                var userId = Convert.ToInt32(httpContext.Request.Query["user"]);
                _connections.Remove(userId, Context.ConnectionId);
            }

            return base.OnDisconnectedAsync(exception);
        }
    }
}
