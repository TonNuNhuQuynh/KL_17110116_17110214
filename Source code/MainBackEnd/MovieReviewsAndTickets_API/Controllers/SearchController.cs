using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MovieReviewsAndTickets_API.Helpers;
using MovieReviewsAndTickets_API.Models;
using MovieReviewsAndTickets_API.ViewModels;

namespace MovieReviewsAndTickets_API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SearchController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private static readonly int Threshold = 10;
        public SearchController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/Search
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Movie>>> GetMovies()
        {
            return await _context.Movies.ToListAsync();
        }

        // GET: api/Search - Seach phim theo tên, diễn viên, đạo diễn hoặc nsx -> search
        [HttpGet("Movies")]
        public async Task<ActionResult<IEnumerable<MovieVM>>> SearchMovies([FromQuery(Name = "name")] string name, [FromQuery(Name = "actor")] string actor,
                                                                           [FromQuery(Name = "director")] string director, [FromQuery(Name = "producer")] string producer)
        {
            List<Movie> searchMovies;
            if (name != null) searchMovies = await _context.Movies.Where(m => m.Title.ToLower()
                                                                  .Contains(name.ToLower()) || m.OriginalTitle.ToLower().Contains(name.ToLower()) && m.IsDeleted == false)
                                                                  .ToListAsync();
            else if (director != null) searchMovies = await _context.Movies.Where(m => m.Directors.ToLower().Contains(director.ToLower()) && m.IsDeleted == false)
                                                                           .ToListAsync();
            else if (producer != null) searchMovies = await _context.Movies.Where(m => m.Producers.ToLower().Contains(producer.ToLower()) && m.IsDeleted == false)
                                                                           .ToListAsync();
            else
            {
                var lstMovieIds = await _context.Casts.Where(c => c.Name.ToLower().Contains(actor.ToLower())).Select(m => m.MovieId).ToListAsync();
                searchMovies = await _context.Movies.Where(m => lstMovieIds.Contains(m.Id) && m.IsDeleted == false).ToListAsync();
            }
            var reviews = await _context.Reviews.ToListAsync();
            return searchMovies.Select(m => new MovieVM() { Movie = m, Ratings = AvgRatingsAsync(reviews.Where(r => r.MovieId == m.Id && r.IsDeleted == false).ToList()) }).ToList();
        }
        // GET: api/Search/Posts - Lấy post có chứa từ khóa search -> search
        [HttpGet("Posts")]
        public async Task<ActionResult<object>> SearchPosts([FromQuery(Name = "query")] string name)
        {
            string query = name.ToLower();
            List<Post> posts = await _context.Posts.Where(p => !p.IsDeleted && p.Status == PostsHelper.PublishedP && (p.Title.ToLower().Contains(query) || p.Keywords.ToLower().Contains(query)))
                                                   .Include(p => p.Account)
                                                   .Include(p => p.PostType).Include(p => p.PostTheme)
                                                   .OrderByDescending(p => p.PublishedDate).ToListAsync();

            posts.ForEach(p => { p.Account = new Account() { UserName = p.Account.UserName, Id = p.AccountId }; });
            int total = posts.Count;
            if (posts.Count > Threshold) posts = posts.GetRange(0, Threshold);
            return new { Posts = posts, Total = total };
        }

        //GET: api/Search/LoadMore - Load tiếp news
        [HttpGet("LoadMore")]
        public async Task<ActionResult<IEnumerable<Post>>> LoadMorePosts([FromQuery(Name = "query")] string name, [FromQuery(Name = "start")] int startIndex)
        {
            string query = name.ToLower();
            List<Post> posts = await _context.Posts.Where(p => !p.IsDeleted && p.Status == PostsHelper.PublishedP && (p.Title.ToLower().Contains(query) || p.Keywords.ToLower().Contains(query)))
                                                   .Include(p => p.Account)
                                                   .Include(p => p.PostType).Include(p => p.PostTheme)
                                                   .OrderByDescending(p => p.PublishedDate).ToListAsync();

            posts.ForEach(p => { p.Account = new Account() { UserName = p.Account.UserName, Id = p.AccountId }; });
            int leftOver = posts.Count - startIndex;
            if (leftOver >= 10) posts = posts.GetRange(startIndex, Threshold);
            else posts = posts.GetRange(startIndex, leftOver);
            return posts;
        }

        private float AvgRatingsAsync(List<Review> reviews)
        {
            float totalRatings = 0;
            if (reviews.Count == 0) return 0;
            foreach (var r in reviews) totalRatings += r.Ratings;
            return (float)totalRatings / reviews.Count;
        }
    }
}
