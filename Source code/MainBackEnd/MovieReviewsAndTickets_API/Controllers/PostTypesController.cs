using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MovieReviewsAndTickets_API.Helpers;
using MovieReviewsAndTickets_API.Models;

namespace MovieReviewsAndTickets_API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PostTypesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public PostTypesController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/PostTypes - Lấy list các loại bài viết
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
        [Authorize(Roles = RolesHelper.SuperAdmin)]
        [HttpGet]
        public async Task<ActionResult<IEnumerable<PostType>>> GetPostTypes()
        {
            return await _context.PostTypes.ToListAsync();
        }

        // GET: api/PostTypes/5
        //[HttpGet("{id}")]
        //public async Task<ActionResult<PostType>> GetPostType(byte id)
        //{
        //    var postType = await _context.PostTypes.FindAsync(id);
        //    if (postType == null) return NotFound();
        //    return postType;
        //}

        // PUT: api/PostTypes/5 - Update post type -> manage-category
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
        [Authorize(Roles = RolesHelper.SuperAdmin)]
        [HttpPut("{id}")]
        public async Task<ActionResult<PostType>> PutPostType(byte id, PostType postType)
        {
            if (id != postType.Id) return BadRequest();
            _context.Entry(postType).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!PostTypeExists(id)) return NotFound();
                else throw;
            }

            return postType;
        }

        // POST: api/PostTypes - Add post type -> manage-category
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
        [Authorize(Roles = RolesHelper.SuperAdmin)]
        [HttpPost]
        public async Task<ActionResult<PostType>> PostPostType(PostType postType)
        {
            _context.PostTypes.Add(postType);
            await _context.SaveChangesAsync();
            return postType;
        }

        // DELETE: api/PostTypes/5 - Delete post type -> manage-category
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
        [Authorize(Roles = RolesHelper.SuperAdmin)]
        [HttpDelete("{id}")]
        public async Task<ActionResult<PostType>> DeletePostType(byte id)
        {
            var postType = await _context.PostTypes.Where(l => l.Id == id).Include(l => l.Posts).FirstOrDefaultAsync();
            if (postType == null) return NotFound();
            if (postType.Posts.Count > 0) return NotFound();
            _context.PostTypes.Remove(postType);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        private bool PostTypeExists(byte id)
        {
            return _context.PostTypes.Any(e => e.Id == id);
        }
    }
}
