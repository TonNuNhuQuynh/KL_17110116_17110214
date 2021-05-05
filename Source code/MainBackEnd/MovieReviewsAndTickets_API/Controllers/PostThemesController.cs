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
    public class PostThemesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public PostThemesController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/PostThemes - Lấy list các chủ đề bài viết
        [HttpGet]
        public async Task<ActionResult<IEnumerable<PostTheme>>> GetPostThemes()
        {
            return await _context.PostThemes.ToListAsync();
        }

        // GET: api/PostThemes/5
        //[HttpGet("{id}")]
        //public async Task<ActionResult<PostTheme>> GetPostTheme(byte id)
        //{
        //    var postTheme = await _context.PostThemes.FindAsync(id);
        //    if (postTheme == null) return NotFound();
        //    return postTheme;
        //}

        // PUT: api/PostThemes/5 - Update post theme -> manage-category
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
        [Authorize(Roles = RolesHelper.SuperAdmin)]
        [HttpPut("{id}")]
        public async Task<ActionResult<PostTheme>> PutPostTheme(byte id, PostTheme postTheme)
        {
            if (id != postTheme.Id) return BadRequest();
            _context.Entry(postTheme).State = EntityState.Modified;
            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!PostThemeExists(id)) return NotFound();
                else throw;
            }
            return postTheme;
        }

        // POST: api/PostThemes - Add post theme -> manage-category
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
        [Authorize(Roles = RolesHelper.SuperAdmin)]
        [HttpPost]
        public async Task<ActionResult<PostTheme>> PostPostTheme(PostTheme postTheme)
        {
            _context.PostThemes.Add(postTheme);
            await _context.SaveChangesAsync();
            return postTheme;
        }

        // DELETE: api/PostThemes/5 - Delete post theme -> manage-category
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
        [Authorize(Roles = RolesHelper.SuperAdmin)]
        [HttpDelete("{id}")]
        public async Task<ActionResult<PostTheme>> DeletePostTheme(byte id)
        {
            var postTheme = await _context.PostThemes.FindAsync(id);
            if (postTheme == null) return NotFound();
            _context.PostThemes.Remove(postTheme);
            await _context.SaveChangesAsync();
            return postTheme;
        }

        private bool PostThemeExists(byte id)
        {
            return _context.PostThemes.Any(e => e.Id == id);
        }
    }
}
