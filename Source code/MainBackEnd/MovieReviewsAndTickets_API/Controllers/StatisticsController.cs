using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MovieReviewsAndTickets_API.Helpers;
using MovieReviewsAndTickets_API.Models;
using MovieReviewsAndTickets_API.Services.SignalR;
using Task = MovieReviewsAndTickets_API.Models.Task;

namespace MovieReviewsAndTickets_API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class StatisticsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<Account> _userManager;
        private readonly IConnectionMapping<int> _connections;
        public StatisticsController(ApplicationDbContext context, UserManager<Account> userManager, IConnectionMapping<int> connectionMapping)
        {
            _context = context;
            _userManager = userManager;
            _connections = connectionMapping;
        }
        // GET: api/Statistics/Numbers - Lấy số liệu thống kê -> statistics
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
        [Authorize(Roles = RolesHelper.Admin + "," + RolesHelper.SuperAdmin)]
        [HttpGet("Numbers")]
        public async Task<ActionResult<object>> GetNumbers()
        {
            var movies = await _context.Movies.Where(m => m.IsDeleted == false).ToListAsync();
            var accounts = await _context.Accounts.Where(a => a.IsDeleted == false).ToListAsync();
            var chains = await _context.CinemaChains.Where(c => c.IsDeleted == false).ToListAsync();
            var cinemas = await _context.Cinemas.Where(c => c.IsDeleted == false).ToListAsync();

            return new { Movies = movies.Count, Accounts = accounts.Count, Chains = chains.Count, Cinemas = cinemas.Count };
        }

        // GET: api/Statistics/Top5Reviewed - Lấy top 5 phim được review nhiều nhất -> statistics
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
        [Authorize(Roles = RolesHelper.Admin + "," + RolesHelper.SuperAdmin)]
        [HttpGet("Top5Reviewed")]
        public async Task<ActionResult<object>> GetTop5Reviewed()
        {
            var movies = await _context.Movies.Where(m => m.IsDeleted == false).Include(m => m.Reviews).OrderByDescending(m => m.Reviews.Count).Take(5).ToListAsync();
            var labels = movies.Select(m => m.Title).ToList();
            var series = movies.Select(m => m.Reviews.Count).ToList();
            var lastReview = await _context.Reviews.Where(r => !r.IsDeleted).OrderByDescending(r => r.CreatedDate).FirstOrDefaultAsync();
            return new { Labels = labels, Series = series, LastReview = lastReview.CreatedDate };
        }

        // GET: api/Statistics/Languages - Lấy phim group theo ngôn ngữ -> statistics
        [HttpGet("Languages")]
        public async Task<ActionResult<object>> GetMoviesGroupByLanguage()
        {
            var languages = await _context.Languages
                                          .Include(l => l.Movies)
                                          .Select(l => new { Name = l.Name, Movies = l.Movies.Where(m => !m.IsDeleted).ToList().Count })
                                          .ToListAsync();

            var labels = languages.Select(l => l.Name).ToList();
            var series = languages.Select(l => l.Movies).ToList();
            var most = languages.OrderByDescending(l => l.Movies).FirstOrDefault();
            return new { Labels = labels, Series = series, Most = most.Name };
        }

        // GET: api/Statistics/Behavior - Lấy hoạt động của user trong 12 tháng gần nhất
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
        [Authorize(Roles = RolesHelper.Admin + "," + RolesHelper.SuperAdmin)]
        [HttpGet("Behaviors")]
        public async Task<ActionResult<object>> GetUserBehaviorLast12Months()
        {
            var last12Months = Enumerable.Range(0, 12).Select(i => DateTime.Now.AddMonths(i - 12)).ToList();
            var labels = last12Months.Select(date => date.ToString("MM/yy")).ToList();
            var reviews = await _context.Reviews.ToListAsync();
            var orders = await _context.Orders.ToListAsync();

            var reviewsByMonths = new List<int>();
            var ordersByMonths = new List<int>();
            int maxCount = 0;
            string mostActiveMonth = "";

            last12Months.ForEach(m => {
                int countReviews = reviews.Where(r => r.CreatedDate.Month == m.Month && r.CreatedDate.Year == m.Year).ToList().Count;
                reviewsByMonths.Add(countReviews);
                int countOrders = orders.Where(r => r.CreatedDate.Month == m.Month && r.CreatedDate.Year == m.Year).ToList().Count;
                ordersByMonths.Add(countOrders);
                if (countReviews + countOrders > maxCount)
                {
                    maxCount = countReviews + countOrders;
                    mostActiveMonth = m.ToString("MM/yy");
                }
            });

            return new { Labels = labels, Reviews = reviewsByMonths, Most = mostActiveMonth, Orders = ordersByMonths, MaxCount = maxCount };
        }
        // GET: api/Statistics/Activities - Lấy hoạt động gần đây -> statistics
        //[Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
        //[Authorize(Roles = RolesHelper.Admin + "," + RolesHelper.SuperAdmin)]
        //[HttpGet("Activities")]
        //public async Task<ActionResult<object>> GetRecentActivity()
        //{
        //    var moviesInDB = await _context.Movies.Where(m => !m.IsDeleted).OrderByDescending(m => m.CreatedDate).Include(m => m.Account).Take(5).ToListAsync();
        //    var movies = moviesInDB.Select(m => new { Name = m.Title, Date = m.CreatedDate, Username = m.Account.UserName }).ToList();
        //    var accountsInDB = await _context.Accounts.Where(a => !a.IsDeleted).ToListAsync();
        //    var recentAccounts = new List<object>();
        //    var admins = new List<object>();

        //    accountsInDB.OrderByDescending(a => a.CreatedDate).ToList().ForEach(a => {

        //        string role = _userManager.GetRolesAsync(a).Result.ToList()[0];
        //        if (role != RolesHelper.SuperAdmin)
        //        {
        //            if (recentAccounts.Count < 5) recentAccounts.Add(new { Username = a.UserName, Role = role, Date = a.CreatedDate });
        //            if (role == RolesHelper.Admin) admins.Add(new { Username = a.UserName, Email = a.Email, IsActive = !a.LockoutEnabled && a.EmailConfirmed, Date = a.CreatedDate });
        //        }
        //    });

        //    return new { Movies = movies, Accounts = recentAccounts, Admins = admins};
        //}

        // GET: api/Statistics/Writers - Lấy ds các writer -> task-modal
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
        [Authorize(Roles = RolesHelper.Admin + "," + RolesHelper.SuperAdmin)]
        [HttpGet("Writers")]
        public async Task<ActionResult<IEnumerable<object>>> GetWriters()
        {
            var accounts = await _context.Accounts.Where(a => !a.IsDeleted).ToListAsync();
            var writers = new List<object>();
            accounts.ForEach(a => {
                string role = _userManager.GetRolesAsync(a).Result.ToList()[0];
                if (role == RolesHelper.Writer) writers.Add(new { UserName = a.UserName, Id = a.Id });
            });
            return writers;
        }

        // GET: api/Statistics/Writers - Lấy số liệu thống kê cho writer -> writer/home
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
        [Authorize(Roles = RolesHelper.Writer)]
        [HttpGet("Writers/{userId}")]
        public async Task<ActionResult<object>> GetWriterNumbers(int userId)
        {
            var tasks = await _context.Tasks.Where(m => m.IsDeleted == false && m.ExecuterId == userId).ToListAsync();
            var posts = await _context.Posts.Where(m => m.AccountId == userId).ToListAsync();
            return new
            {
                FinishTasks = tasks.Where(t => t.Status == TaskHelper.ApprovedT).ToList().Count,
                WaitingTasks = tasks.Where(t => t.Status == TaskHelper.WaitingT).ToList().Count,
                Published = posts.Where(p => !p.IsDeleted && p.Status == PostsHelper.PublishedP).ToList().Count,
                Posts = posts.Count
            };
        }
        // GET: api/Statistics/RecentNotifications - Lấy 5 thông báo gần đây nhất của user -> writer/home (User), statistics (Admin)
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
        [Authorize(Roles = RolesHelper.Writer + "," + RolesHelper.Admin + "," + RolesHelper.SuperAdmin)]
        [HttpGet("RecentNotifications/{userId}")]
        public async Task<ActionResult<IEnumerable<Notification>>> GetRecentNotifications(int userId)
        {
            var notifications = await _context.Notifications.Where(n => n.ReceiverId == userId)
                                                            .Include(n => n.Sender)
                                                            .OrderByDescending(n => n.CreatedDate)
                                                            .ToListAsync();
            notifications = notifications.Count > 10 ? notifications.Take(10).ToList() : notifications;
            //notifications.ForEach(n => {
            //    n.Sender = new Account() { UserName = n.Sender.UserName, Id = n.SenderId };
            //});
            return notifications;
        }

        // GET: api/Statistics/RecentNotifications - Lấy 5 thông báo gần đây nhất của user -> writer/home (User), statistics (Admin)
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
        [Authorize(Roles = RolesHelper.Writer)]
        [HttpGet("OnlineWriters/{userId}")]
        public async Task<ActionResult<IEnumerable<object>>> GetOnlineWriters(int userId)
        {
            var accountsInDB = await _context.Accounts.Where(a => !a.IsDeleted && a.Id != userId).Include(a => a.User).ToListAsync();
            var writers = new List<object>();
            accountsInDB.ForEach(a =>
            {
                string role = _userManager.GetRolesAsync(a).Result.ToList()[0];
                if (role == RolesHelper.Writer)
                {
                    if (_connections.GetConnections(a.Id).ToList().Count > 0)
                        writers.Add(new { Username = a.UserName, Email = a.Email, Image = a.User.Image, Active = true });
                    else writers.Add(new { Username = a.UserName, Email = a.Email, Image = a.User.Image, Active = false });
                }
            });
            return writers;
        }
        // GET: api/Statistics/RecentNotifications - Lấy 8 task gần đây nhất của user -> writer/home (User)
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
        [Authorize(Roles = RolesHelper.Writer)]
        [HttpGet("RecentTasks/{userId}")]
        public async Task<ActionResult<IEnumerable<Task>>> GetRecentTasks(int userId)
        {
            var tasks = await _context.Tasks.Where(t => t.ExecuterId == userId && !t.IsDeleted)
                                            .OrderByDescending(t => t.AssignTime).ToListAsync();
            tasks = tasks.Count > 8 ? tasks.Take(8).ToList() : tasks;
            return tasks;
        }
        // GET: api/Statistics/Online - Lấy trạng thái hoạt động của writer và admin -> statistics
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
        [Authorize(Roles = RolesHelper.Admin + "," + RolesHelper.SuperAdmin)]
        [HttpGet("Online/{userId}")]
        public async Task<ActionResult<object>> GetOnlines(int userId)
        {
            var accountsInDB = await _context.Accounts.Where(a => !a.IsDeleted && a.Id != userId).Include(a => a.User).ToListAsync();
            var writers = new List<object>();
            var admins = new List<object>();
            accountsInDB.ForEach(a =>
            {
                string role = _userManager.GetRolesAsync(a).Result.ToList()[0];
                if (role == RolesHelper.Writer)
                {
                    if (_connections.GetConnections(a.Id).ToList().Count > 0)
                        writers.Add(new { Username = a.UserName, Email = a.Email, Image = a.User.Image, Active = true });
                    else writers.Add(new { Username = a.UserName, Email = a.Email, Image = a.User.Image, Active = false });
                }
                else if (role == RolesHelper.Admin || role == RolesHelper.SuperAdmin)
                {
                    if (_connections.GetConnections(a.Id).ToList().Count > 0)
                        admins.Add(new { Username = a.UserName, Email = a.Email, Image = a.User.Image, Active = true });
                    else admins.Add(new { Username = a.UserName, Email = a.Email, Image = a.User.Image, Active = false });
                }
            });
            return new { Writers = writers, Admins = admins };
        }
    }
}
