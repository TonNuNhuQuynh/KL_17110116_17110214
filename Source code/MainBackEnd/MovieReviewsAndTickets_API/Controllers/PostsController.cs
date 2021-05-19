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
    [Route("api/[controller]")]
    [ApiController]
    public class PostsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IHubContext<BroadcastService> _hubContext;
        private readonly IConnectionMapping<int> _connections;
        private IEmailSender _emailSender;

        private static readonly int Threshold = 10;
        public PostsController(ApplicationDbContext context, IHubContext<BroadcastService> hubContext, IConnectionMapping<int> connectionMapping, IEmailSender emailSender)
        {
            _context = context;
            _hubContext = hubContext;
            _connections = connectionMapping;
            _emailSender = emailSender;
        }

        // GET: api/Posts -> manage-posts (admin)
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
        [Authorize(Roles = RolesHelper.SuperAdmin + "," + RolesHelper.Admin)]
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Post>>> GetPosts()
        {
            var posts = await _context.Posts.Where(p => p.Status >= PostsHelper.SentP).Include(p => p.Account).OrderByDescending(p => p.CreatedDate).ToListAsync();
            posts.ForEach(t => {
                t.Account = new Account() { UserName = t.Account.UserName, Id = t.Account.Id };
            });
            return posts;
        }

        // GET: api/Posts/5 -> post-details
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
        [Authorize(Roles = RolesHelper.Writer)]
        [HttpGet("{id}")]
        public async Task<ActionResult<Post>> GetPost(int id)
        {
            var post = await _context.Posts.Where(p => !p.IsDeleted && p.Id == id)
                                           .Include(p => p.Task)
                                           .Include(p => p.Movie).FirstOrDefaultAsync();
            if (post == null) return NotFound();
            if (post.Task != null) post.Task = new Models.Task() { Title = post.Task.Title, Id = post.Task.Id, ExecuterId = post.Task.ExecuterId };
            if (post.Movie != null) post.Movie = new Movie() { Title = post.Movie.Title, Id = post.Movie.Id };
            return post;
        }

        // PUT: api/Posts/5 -> post-details
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
        [Authorize(Roles = RolesHelper.Writer)]
        [HttpPut("{id}")]
        public async Task<IActionResult> PutPost(int id, Post post)
        {
            if (id != post.Id) return BadRequest();
            var postInDb = await _context.Posts.Where(p => !p.IsDeleted && p.Id == id && p.Status < PostsHelper.PublishedP)
                                               .Include(p => p.Account).ThenInclude(a => a.User)
                                               .FirstOrDefaultAsync();
            if (postInDb == null) return NotFound();
            // Update post
            postInDb.Title = post.Title;
            postInDb.Summary = post.Summary;
            postInDb.Cover = post.Cover;
            postInDb.Content = post.Content;
            postInDb.PostTypeId = post.PostTypeId;
            postInDb.PostThemeId = post.PostThemeId;
            postInDb.Spoilers = post.Spoilers;
            postInDb.MovieId = post.MovieId;
            postInDb.Keywords = post.Keywords;
            postInDb.Status = post.Status;
            Notification notification = null;
            if (post.Status == PostsHelper.SentP) // Tạo notification gửi cho admin nếu user update post đã gửi rồi
            {
                var task = await _context.Tasks.Where(t => t.PostId == post.Id && !t.IsDeleted).FirstOrDefaultAsync();
                if (task != null)
                {
                    notification = new Notification() { ReceiverId = task.CreatorId, CreatedDate = DateTime.Now, SenderId = (int)task.ExecuterId };
                    (notification.Message, notification.Url) = NotificationHelper.UpdatePostNoti(task.Executer.UserName, post.Id);
                    _context.Notifications.Add(notification);
                }     
            }    
            await _context.SaveChangesAsync();
            // Nếu post đã được gửi rồi thì notify admin
            if (notification != null) SendMessage(new NotificationVM() { Id = notification.Id, Url = notification.Url, CreatedDate = notification.CreatedDate, Message = notification.Message, SenderImage = postInDb.Account.User.Image, SenderName = postInDb.Account.UserName }, notification.ReceiverId);
            return NoContent();
        }

        // POST: api/Posts -> post-details
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
        [Authorize(Roles = RolesHelper.Writer)]
        [HttpPost]
        public async Task<IActionResult> PostPost(Post post)
        {
            _context.Posts.Add(post);
            await _context.SaveChangesAsync();
            return new JsonResult(post.Id);
        }

        // DELETE: api/Posts/TakeDown/0/5: Gỡ bài viết (mode = 1) hay hủy gỡ bài viết (mode = 0) - manage-posts
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
        [Authorize(Roles = RolesHelper.SuperAdmin)]
        [HttpDelete("TakeDown/{mode}/{id}")]
        public async Task<IActionResult> TakeDownPost(int id, int mode)
        {
            var post = await _context.Posts.FindAsync(id);
            if (post == null) return NotFound();
            post.IsDeleted = mode == 1 ? true : false;
            await _context.SaveChangesAsync();
            return NoContent();
        }
        // GET: api/Posts/User/id - Lấy những post của user -> post-list
        [HttpGet("User/{id}")]
        public async Task<ActionResult<IEnumerable<Post>>> GetUserPosts(int id)
        {
            return await _context.Posts.Where(t => t.AccountId == id).OrderByDescending(t => t.CreatedDate).ToListAsync();
        }

        // GET: api/Posts/Settings - Lấy danh mục: phim, chủ đề và phân loại cho bài viết -> post-details
        [HttpGet("Settings")]
        public async Task<ActionResult<object>> GetPostSettings()
        {
            var types = await _context.PostTypes.ToListAsync();
            var themes = await _context.PostThemes.ToListAsync();
            var movies = await _context.Movies.Where(m => !m.IsDeleted).Select(m => new { Title = m.Title, Id = m.Id }).ToListAsync();
            return new { Types = types, Themes = themes, Movies = movies };
        }

        // GET: api/Posts/Send - Nộp bài viết cho task -> pick-task
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
        [Authorize(Roles = RolesHelper.Writer)]
        [HttpGet("Send/{postId}/{taskId}")]
        public async Task<ActionResult<object>> SendPost(int postId, int taskId)
        {
            var task = await _context.Tasks.Where(t => !t.IsDeleted && t.Id == taskId && t.Deadline > DateTime.Now)
                                           .Include(t => t.Executer).ThenInclude(a => a.User)
                                           .Include(t => t.Creator)
                                           .FirstOrDefaultAsync();
            if (task == null) return NotFound();
            task.PostId = postId;
            task.Status = TaskHelper.UnApprovedT;
            var post = await _context.Posts.Where(p => !p.IsDeleted && p.Id == postId).FirstOrDefaultAsync();
            if (post == null) return NotFound();
            post.Status = PostsHelper.SentP;
            // Tạo notification gửi cho admin
            Notification notification = new Notification() { ReceiverId = task.CreatorId, CreatedDate = DateTime.Now, SenderId = (int)task.ExecuterId };
            (notification.Message, notification.Url) = NotificationHelper.SendPostNoti(task.Executer.UserName, task.Title, postId);
            _context.Notifications.Add(notification);
            await _context.SaveChangesAsync();
            //Gửi email vs noti cho admin đc gửi post
            string link = $"{notification.Url}&view={notification.Id}";
            await this._emailSender.SendEmailAsync(task.Creator.Email, task.Title, $"Xin chào {task.Creator.UserName}, <br>" +
                    $"{task.Executer.UserName} đã gửi cho bạn bài viết của task <strong>{task.Title}</strong>. Xem bài viết <a href={link}>tại đây</a>");
            SendMessage(new NotificationVM() { Id = notification.Id, Url = notification.Url, CreatedDate = notification.CreatedDate, Message = notification.Message, SenderImage = task.Executer.User.Image, SenderName = task.Executer.UserName }, notification.ReceiverId);
            return NoContent();
        }

        // GET: api/Posts/Review/5 -> post-review (Admin vs User)
        [HttpGet("Review/{id}")]
        public async Task<ActionResult<Post>> ReviewPost(int id)
        {
            var post = await _context.Posts.Where(p => !p.IsDeleted && p.Id == id)
                                           .Include(p => p.Account)
                                           .Include(p => p.PostType).Include(p => p.PostTheme)
                                           .Include(p => p.Task)
                                           .Include(p => p.Movie).FirstOrDefaultAsync();
            if (post == null) return NotFound();
            if (post.Task != null) post.Task = new Models.Task() { Title = post.Task.Title, Id = post.Task.Id, CreatorId = post.Task.CreatorId };
            if (post.Movie != null) post.Movie = new Movie() { Title = post.Movie.Title, Id = post.Movie.Id };
            post.Account = new Account() { UserName = post.Account.UserName, Id = post.Account.Id };
            return post;
        }
        // GET: api/Posts/Publish/5 -> post-review (Admin)
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
        [Authorize(Roles = RolesHelper.SuperAdmin + "," + RolesHelper.Admin)]
        [HttpGet("Publish/{postId}/{taskId}")]
        public async Task<ActionResult<Post>> PublishPost(int postId, int taskId)
        {
            var post = await _context.Posts.Where(p => !p.IsDeleted && p.Id == postId).FirstOrDefaultAsync();
            if (post == null) return NotFound();
            // Chỉnh status của post thành publish
            post.Status = PostsHelper.PublishedP;
            post.PublishedDate = DateTime.Now;
            // Chỉnh status của task thành finish
            var task = await _context.Tasks.Where(t => t.Id == taskId).FirstOrDefaultAsync();
            task.Status = TaskHelper.ApprovedT;
            await _context.SaveChangesAsync();
            return new JsonResult(post.PublishedDate.ToString());
        }

        // Posts/GetCategories - Lấy danh mục bài viết -> news-list, navbar
        [HttpGet("GetCategories")]
        public async Task<ActionResult<object>> GetCategories()
        {
            return new { Types = await _context.PostTypes.ToListAsync(), Themes = await _context.PostThemes.ToListAsync() };
        }

        // GET: Posts/GetPostsByCategory - Lấy post theo chủ đề, chuyên đề hoặc từ khóa -> news-list 
        [HttpGet("GetPostsByCategory")]
        public async Task<ActionResult<object>> GetPostsByCategory([FromQuery(Name = "type")] byte? typeId, [FromQuery(Name = "theme")] byte? themeId, [FromQuery(Name = "tag")] string tag)
        {
            List<Post> posts = null;
            object title = null;
            if (typeId != null)
            {
                posts = await _context.Posts.Where(p => !p.IsDeleted && p.Status == PostsHelper.PublishedP && p.PostTypeId == typeId)
                                                            .Include(p => p.Account)
                                                            .Include(p => p.PostType).Include(p => p.PostTheme)
                                                            .OrderByDescending(p => p.PublishedDate).ToListAsync();
                title = posts.Count > 0 ? posts[0].PostType : await _context.PostTypes.FindAsync(typeId);
            }
            else if (themeId != null)
            {
                posts = await _context.Posts.Where(p => !p.IsDeleted && p.Status == PostsHelper.PublishedP && p.PostThemeId == themeId)
                                            .Include(p => p.Account)
                                            .Include(p => p.PostType).Include(p => p.PostTheme)
                                            .OrderByDescending(p => p.PublishedDate).ToListAsync();
                title = posts.Count > 0 ? posts[0].PostTheme : await _context.PostThemes.FindAsync(themeId);
            }
            else if (tag != null) posts = await _context.Posts.Where(p => !p.IsDeleted && p.Status == PostsHelper.PublishedP && p.Keywords.ToLower().Contains(tag.ToLower()))
                                                .Include(p => p.Account).Include(p => p.PostType).Include(p => p.PostTheme)
                                                .OrderByDescending(p => p.PublishedDate).ToListAsync();
            else return BadRequest();

            posts.ForEach(p => { p.Account = new Account() { UserName = p.Account.UserName, Id = p.AccountId }; });
            int total = posts.Count;
            if (posts.Count > Threshold) posts = posts.GetRange(0, Threshold);
            return new { Posts = posts, Title = title, Total = total };
        }

        // Posts/GetReviewsOfTheme - Lấy 5 bài có chủ đề là 'Đánh giá phim' và chuyên đề là themeId gần đây nhất -> news-list 
        [HttpGet("GetReviewsOfTheme/{themeId}")]
        public async Task<ActionResult<IEnumerable<Post>>> GetReviewsOfTheme(byte themeId)
        {
            var posts = await _context.Posts.Where(p => !p.IsDeleted && p.Status == PostsHelper.PublishedP && p.PostThemeId == themeId && p.PostTypeId == 2)
                                            .Include(p => p.Account)
                                            .OrderByDescending(p => p.PublishedDate).ToListAsync();
            posts = posts.Count > 5 ? posts.Take(5).ToList() : posts;
            posts.ForEach(p => { p.Account = new Account() { UserName = p.Account.UserName, Id = p.AccountId }; });
            return posts;
        }

        // Posts/LoadMore - Lấy 5 bài có chủ đề là 'Đánh giá phim' và chuyên đề là themeId gần đây nhất -> news-list 
        [HttpGet("LoadMore")]
        public async Task<ActionResult<IEnumerable<Post>>> LoadMorePosts([FromQuery(Name = "type")] byte? typeId, [FromQuery(Name = "theme")] byte? themeId, [FromQuery(Name = "tag")] string tag, [FromQuery(Name = "start")] int startIndex)
        {
            List<Post> posts = null;
            if (typeId != null) posts = await _context.Posts.Where(p => !p.IsDeleted && p.Status == PostsHelper.PublishedP && p.PostTypeId == typeId)
                                                            .Include(p => p.Account)
                                                            .Include(p => p.PostType).Include(p => p.PostTheme)
                                                            .OrderByDescending(p => p.PublishedDate).ToListAsync();
            else if (themeId != null) posts = await _context.Posts.Where(p => !p.IsDeleted && p.Status == PostsHelper.PublishedP && p.PostThemeId == themeId)
                                                                  .Include(p => p.Account)
                                                                  .Include(p => p.PostType).Include(p => p.PostTheme)
                                                                  .OrderByDescending(p => p.PublishedDate).ToListAsync();
            else if (tag != null) posts = await _context.Posts.Where(p => !p.IsDeleted && p.Status == PostsHelper.PublishedP && p.Keywords.ToLower().Contains(tag.ToLower()))
                                                              .Include(p => p.Account).Include(p => p.PostType).Include(p => p.PostTheme)
                                                              .OrderByDescending(p => p.PublishedDate).ToListAsync();
            else return BadRequest();
            int leftOver = posts.Count - startIndex;
            if (leftOver >= 10) posts = posts.GetRange(startIndex, Threshold);
            else posts = posts.GetRange(startIndex, leftOver);
            return posts;
        }

        // GET: api/Posts/Movie/id - Lấy những post của movie -> movie-details/news
        [HttpGet("Movie/{id}")]
        public async Task<ActionResult<object>> GetMoviePosts(int id)
        {
            var posts = await _context.Posts.Where(t => t.MovieId == id && t.Status == PostsHelper.PublishedP && !t.IsDeleted)
                                            .Include(p => p.Account)
                                            .Include(p => p.PostType).Include(p => p.PostTheme)
                                            .OrderByDescending(p => p.PublishedDate).ToListAsync();
            var reviews = posts.Where(t => t.PostTypeId == 2).ToList();
            reviews = reviews.Count > 5 ? reviews.Take(5).ToList() : reviews;
            posts.ForEach(p => { p.Account = new Account() { UserName = p.Account.UserName, Id = p.AccountId }; });
            int total = posts.Count;
            if (posts.Count > Threshold) posts = posts.GetRange(0, Threshold);
            return new { Posts = posts, Reviews = reviews, Total = total };
        }
        // GET: api/Posts/Movie/LoadMore/id/startIndex - Load thêm các post của movie -> movie-details/news
        [HttpGet("Movie/LoadMore/{id}/{startIndex}")]
        public async Task<ActionResult<IEnumerable<Post>>> LoadMorePostsOfMovie(int id, int startIndex)
        {
            var posts = await _context.Posts.Where(t => t.MovieId == id && t.Status == PostsHelper.PublishedP && !t.IsDeleted)
                                            .Include(p => p.Account)
                                            .Include(p => p.PostType).Include(p => p.PostTheme)
                                            .OrderByDescending(p => p.PublishedDate).ToListAsync();
            int leftOver = posts.Count - startIndex;
            if (leftOver >= 10) posts = posts.GetRange(startIndex, Threshold);
            else posts = posts.GetRange(startIndex, leftOver);
            return posts;
        }

        // GET: api/Posts/View/5 -> view-post (User)
        [HttpGet("View/{id}")]
        public async Task<ActionResult<Post>> ViewPost(int id)
        {
            var post = await _context.Posts.Where(p => !p.IsDeleted && p.Id == id && p.Status == PostsHelper.PublishedP)
                                           .Include(p => p.Account)
                                           .Include(p => p.PostType).Include(p => p.PostTheme)
                                           .Include(p => p.Movie).FirstOrDefaultAsync();
            if (post == null) return NotFound();
            if (post.Movie != null) post.Movie = new Movie() { Title = post.Movie.Title, Id = post.Movie.Id };
            post.Account = new Account() { UserName = post.Account.UserName, Id = post.Account.Id };
            return post;
        }
        // GET: api/Posts/GetSimilar/5 -> Lấy những post liên quan (post có cùng 1 movieId vs post có chung từ khóa) view-post (User)
        [HttpGet("View/GetSimilar/{id}")]
        public async Task<ActionResult<IEnumerable<Post>>> GetSimilarPosts(int id)
        {
            var post = await _context.Posts.Where(p => !p.IsDeleted && p.Id == id && p.Status == PostsHelper.PublishedP).FirstOrDefaultAsync();
            if (post == null) return NotFound();
            int? movieId = post.MovieId != null ? post.MovieId : 0;
            var postTags = post.Keywords.Split('/').ToList();
            if (postTags.Count == 0) return await _context.Posts.Where(p => !p.IsDeleted && p.MovieId == movieId && p.Status == PostsHelper.PublishedP && p.Id != id)
                                             .Include(p => p.Account)
                                             .Include(p => p.PostType).Include(p => p.PostTheme)
                                             .OrderByDescending(p => p.PublishedDate)
                                             .Include(p => p.Movie).ToListAsync();
            List<Post> posts = new List<Post>();
            foreach (string tag in postTags)
            {
                var postsHaveKeywordOrSameMovie = await _context.Posts.Where(p => !p.IsDeleted && (p.Keywords.ToLower().Contains(tag.ToLower()) || p.MovieId == movieId) && p.Status == PostsHelper.PublishedP && p.Id != id)
                                                                      .Include(p => p.Account)
                                                                      .Include(p => p.PostType).Include(p => p.PostTheme)
                                                                      .OrderByDescending(p => p.PublishedDate)
                                                                      .Include(p => p.Movie).ToListAsync();
                posts.AddRange(postsHaveKeywordOrSameMovie);
                posts = posts.Distinct().ToList();
                if (posts.Count >= 5) break;
            };
            return posts.Count > 5 ? posts.Take(5).ToList() : posts;
        }
        // DELETE: api/Posts/Writer/5 - Writer xóa post mà writer chưa nộp cho admin -> post-list (User)
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
        [Authorize(Roles = RolesHelper.Writer)]
        [HttpDelete("Writer/{id}")]
        public async Task<IActionResult> WriterDeletePost(int id)
        {
            var post = await _context.Posts.Where(p => !p.IsDeleted && p.Id == id && p.Status == PostsHelper.ProcessingP).FirstOrDefaultAsync();
            if (post == null) return NotFound();
            _context.Posts.Remove(post);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // GET: api/Posts/8RecentPosts - Lấy 8 post gần đây nhất - components (User)
        [HttpGet("8RecentPosts")]
        public async Task<ActionResult<IEnumerable<Post>>> Get8RecentPosts()
        {
            return await _context.Posts.Where(p => !p.IsDeleted && p.Status == PostsHelper.PublishedP)
                                       .Include(p => p.Account)
                                       .Include(p => p.PostType).Include(p => p.PostTheme)
                                       .OrderByDescending(p => p.PublishedDate).Take(8).ToListAsync();
        }

        // GET: api/Posts/UpdateViews - Cập nhật view của PostTypes & PostThemes - view-post (User)
        [HttpGet("UpdateViews")]
        public async Task<IActionResult> UpdateViews([FromQuery(Name = "type")] byte typeId, [FromQuery(Name = "theme")] byte? themeId)
        {
            var postType = await _context.PostTypes.Where(t => t.Id == typeId).FirstOrDefaultAsync();
            if (postType == null) return NotFound();
            postType.Views++;
            var postTheme = await _context.PostThemes.Where(t => t.Id == themeId).FirstOrDefaultAsync();
            if (postTheme != null) postTheme.Views++;
            await _context.SaveChangesAsync();
            return NoContent();
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
}
