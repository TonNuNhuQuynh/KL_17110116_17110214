using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.VisualBasic;
using MovieReviewsAndTickets_API.Helpers;
using MovieReviewsAndTickets_API.Models;
using MovieReviewsAndTickets_API.ViewModels;

namespace MovieReviewsAndTickets_API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ReviewsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        private static readonly int Threshold = 10;
        private readonly UserManager<Account> _userManager;
        public ReviewsController(ApplicationDbContext context, UserManager<Account> userManager)
        {
            _context = context;
            _userManager = userManager;
        }

        // GET: api/Reviews
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Review>>> GetReviews()
        {
            return await _context.Reviews.ToListAsync();
        }

        // GET: api/Reviews/Details - Lấy chi tiết review -> rate-modal
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
        [Authorize(Roles = RolesHelper.Writer + "," + RolesHelper.User)]
        [HttpGet("Details")]
        public async Task<ActionResult<Review>> GetReviewOfAccount([FromQuery(Name = "movieId")] int movieId, [FromQuery(Name = "accountId")] int accountId)
        {
            var review = await _context.Reviews.Where(r => r.AccountId == accountId && r.MovieId == movieId && !r.IsDeleted).FirstOrDefaultAsync();
            if (review == null) return NotFound();
            return review;
        }

        // GET: api/Reviews/5 - Lấy các reviews của phim -> movie-details/review-list
        [HttpGet("{movieId}")]
        public async Task<ActionResult<ListReviewVM>> GetReviewsOfMovie(int movieId)
        {
            var lstReviewInDB = await _context.Reviews.Where(r => r.MovieId == movieId && !r.IsDeleted).Include(r => r.ReviewLikes).Include(r => r.Account).ThenInclude(a => a.User).OrderByDescending(r => r.CreatedDate).ToListAsync();
            var likesOfMovie = await _context.MovieLikes.Where(r => r.MovieId == movieId).ToListAsync();
            var movieInDB = await _context.Movies.Where(m => m.Id == movieId).FirstOrDefaultAsync();

            List<Review> firstReviews = new List<Review>();
            firstReviews = lstReviewInDB;
            if (lstReviewInDB.Count > Threshold) firstReviews = lstReviewInDB.GetRange(0, Threshold);

            ListReviewVM listReviewVM = new ListReviewVM();
            foreach (var review in firstReviews)
            {
                int likes = review.ReviewLikes.Where(r => r.Liked).ToList().Count;
                int dislikes = review.ReviewLikes.Where(r => !r.Liked).ToList().Count;
                ReviewVM reviewVM = new ReviewVM() { Id = review.Id, Content = review.Content, Ratings = review.Ratings, Spoilers = review.Spoilers, CreatedDate = review.CreatedDate, MovieId = review.MovieId, LikeCounts = likes, DislikeCounts = dislikes, Username = review.Account.UserName, Image = review.Account.User.Image };
                reviewVM.Role = _userManager.GetRolesAsync(review.Account).Result.ToList()[0];
                listReviewVM.Reviews.Add(reviewVM);
            }
            listReviewVM.Total = lstReviewInDB.Count;
            listReviewVM.Likes = likesOfMovie.Count;
            //listReviewVM.Average = await AvgRatingsAsync(movieId);
            listReviewVM.Percent = CalculateSatisfiedScore(lstReviewInDB);
            listReviewVM.Title = movieInDB.OriginalTitle;
            listReviewVM.ReleaseDate = movieInDB.ReleaseDate;
            return listReviewVM;
        }

        [HttpGet("{movieId}/{startIndex}")]
        public async Task<ActionResult<IEnumerable<ReviewVM>>> LoadMoreReviews(int movieId, int startIndex)
        {
            var lstReviewInDB = await _context.Reviews.Where(r => r.MovieId == movieId && !r.IsDeleted).Include(r => r.ReviewLikes).Include(r => r.Account).ThenInclude(a => a.User).OrderByDescending(r => r.CreatedDate).ToListAsync();
            int leftOver = lstReviewInDB.Count - startIndex;
            if (leftOver >= 10) lstReviewInDB = lstReviewInDB.GetRange(startIndex, Threshold);
            else lstReviewInDB = lstReviewInDB.GetRange(startIndex, leftOver);

            List<ReviewVM> reviews = new List<ReviewVM>();
            foreach (var review in lstReviewInDB)
            {
                int likes = review.ReviewLikes.Where(r => r.Liked).ToList().Count;
                int dislikes = review.ReviewLikes.Where(r => !r.Liked).ToList().Count;
                ReviewVM reviewVM = new ReviewVM() { Id = review.Id, Content = review.Content, Ratings = review.Ratings, Spoilers = review.Spoilers, CreatedDate = review.CreatedDate, MovieId = review.MovieId, LikeCounts = likes, DislikeCounts = dislikes, Username = review.Account.UserName, Image = review.Account.User.Image };
                reviewVM.Role = _userManager.GetRolesAsync(review.Account).Result.ToList()[0];
                reviews.Add(reviewVM);
            }
            return reviews;
        }

        // PUT: api/Reviews/5
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
        [Authorize(Roles = RolesHelper.Writer + "," + RolesHelper.User)]
        [HttpPut("{id}")]
        public async Task<ActionResult<MovieVM>> PutReview(int id, Review review)
        {
            if (id != review.Id) return BadRequest();
            var reviewInDB = await _context.Reviews.Where(r => r.Id == review.Id && !r.IsDeleted).FirstOrDefaultAsync();
            if (reviewInDB == null) return NotFound();
            byte rate = reviewInDB.Ratings;
            reviewInDB.Ratings = review.Ratings;
            reviewInDB.Spoilers = review.Spoilers;
            reviewInDB.Content = review.Content;
            await _context.SaveChangesAsync();
            var reviews = await _context.Reviews.Where(r => !r.IsDeleted).ToListAsync();
            var movie = await _context.Movies.Where(m => m.Id == review.MovieId).FirstOrDefaultAsync();
            return new MovieVM() { Movie = movie, Ratings = AvgRatingsAsync(reviews.Where(r => r.MovieId == review.MovieId).ToList()) };
        }

        // POST: api/Reviews
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
        [Authorize(Roles = RolesHelper.Writer + "," + RolesHelper.User)]
        [HttpPost]
        public async Task<ActionResult<MovieVM>> PostReview(Review review)
        {
            // Post bình luận về phim mà mình đã review nhưng đã xóa
            var reviewInDB = await _context.Reviews.Where(r => r.AccountId == review.AccountId && r.MovieId == review.MovieId && r.IsDeleted).FirstOrDefaultAsync();
            if (reviewInDB != null) // Nếu tìm thấy thì put review
            {
                reviewInDB.CreatedDate = DateTime.Now;
                reviewInDB.Content = review.Content;
                reviewInDB.Ratings = review.Ratings;
                reviewInDB.Spoilers = review.Spoilers;
                reviewInDB.IsDeleted = false;
            }
            else _context.Reviews.Add(review);
            await _context.SaveChangesAsync();

            var reviews = await _context.Reviews.Where(r => !r.IsDeleted).ToListAsync();
            var movie = await _context.Movies.Where(m => m.Id == review.MovieId).FirstOrDefaultAsync();
            return new MovieVM() { Movie = movie, Ratings = AvgRatingsAsync(reviews.Where(r => r.MovieId == review.MovieId).ToList()) };
        }

        // DELETE: api/Reviews/5
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
        [Authorize(Roles = RolesHelper.Writer + "," + RolesHelper.User)]
        [HttpDelete("{id}")]
        public async Task<ActionResult<MovieVM>> DeleteReview(int id)
        {
            var review = await _context.Reviews.FindAsync(id);
            if (review == null) return NotFound();
            review.IsDeleted = true;
            var reviewLikes = await _context.ReviewLikes.Where(m => m.AccountId == id).ToListAsync();
            _context.ReviewLikes.RemoveRange(reviewLikes);
            await _context.SaveChangesAsync();
            var reviews = await _context.Reviews.Where(r => !r.IsDeleted && r.MovieId == review.MovieId).ToListAsync();
            var movie = await _context.Movies.Where(m => m.Id == review.MovieId).FirstOrDefaultAsync();
            return new MovieVM() { Movie = movie, Ratings = AvgRatingsAsync(reviews) };
        }

        //private bool ReviewExists(int id)
        //{
        //    return _context.Reviews.Any(e => e.Id == id);

        //}
        private int CalculateSatisfiedScore(List<Review> reviews)
        {
            int counts = 0;
            foreach (var r in reviews)
                if (r.Ratings >= 7) counts++;
            return reviews.Count > 0 ? (counts * 100) / reviews.Count : 0;
        }
        
        private float AvgRatingsAsync(List<Review> reviews)
        {
            float totalRatings = 0;
            if (reviews.Count == 0) return 0;
            foreach (var r in reviews)
                totalRatings += r.Ratings;
            return (float)totalRatings / reviews.Count;
        }
    }
}
