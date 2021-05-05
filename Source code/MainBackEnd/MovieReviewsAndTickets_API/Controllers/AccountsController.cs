using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Net.Http;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using Google.Apis.Auth;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using MovieReviewsAndTickets_API.Helpers;
using MovieReviewsAndTickets_API.Models;
using MovieReviewsAndTickets_API.Services;
using MovieReviewsAndTickets_API.ViewModels;
using Newtonsoft.Json;

namespace MovieReviewsAndTickets_API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AccountsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<Account> _userManager;
        private readonly IEmailSender _emailSender;
        private readonly AppSettings _appSettings;
        public AccountsController(ApplicationDbContext context, UserManager<Account> userManager, IEmailSender emailSender, IOptions<AppSettings> appSettings)
        {
            _context = context;
            _userManager = userManager;
            _emailSender = emailSender;
            _appSettings = appSettings.Value;
        }

        // GET: Lấy list account -> manage-accounts
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
        [Authorize(Roles = RolesHelper.SuperAdmin + "," + RolesHelper.Admin)]
        [HttpGet]
        public async Task<ActionResult<IEnumerable<AccountVM>>> GetAccounts()
        {
            var lstAccountVM = new List<AccountVM>();
            var lstAccount = await _context.Accounts.Where(a => a.IsDeleted == false).Include(a => a.User).ToListAsync();

            foreach (var account in lstAccount)
            {
                account.User.Account = null;
                AccountVM accountVM = new AccountVM()
                {
                    Id = account.Id,
                    Username = account.UserName,
                    Email = account.Email,
                    Password = null,
                    Phone = null,
                    IsActive = !account.LockoutEnabled,
                    User = account.User,
                    RoleName = _userManager.GetRolesAsync(account).Result.ToList()[0]
                };
                lstAccountVM.Add(accountVM);
            }
            return lstAccountVM;
        }

        //GET: Lấy profile của user -> profile
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
        [HttpGet("{id}")]
        public async Task<ActionResult<AccountVM>> GetAccount(int id)
        {
            var account = await _context.Accounts.Include(a => a.User).Where(a => a.Id == id && a.IsDeleted == false).FirstAsync();
            if (account == null) return NoContent();
            account.User.Account = null;

            AccountVM accountVM = new AccountVM()
            {
                Id = account.Id,
                Username = account.UserName,
                Email = account.Email,
                Password = null,
                Phone = account.PhoneNumber == null? "": account.PhoneNumber,
                IsActive = !account.LockoutEnabled,
                User = account.User,
                RoleName = _userManager.GetRolesAsync(account).Result.ToList()[0]
            };
            return accountVM;
        }

        //PUT: Edit profile của user -> profile
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
        [HttpPut("{id}")]
        public async Task<ActionResult<AccountVM>> EditProfile(int id, AccountVM account)
        {
            if (id != account.Id)
            {
                return BadRequest();
            }

            var accountInDB = await _context.Accounts.Where(u => u.Id == id).FirstAsync();
            accountInDB.PhoneNumber = account.Phone;

            //var user = JsonConvert.DeserializeObject<User>(HttpContext.Request.Form["user"]);
            var userInDb = await _context.Users.Where(u => u.AccountId == id).FirstAsync();
            userInDb.Fullname = account.User.Fullname;
            userInDb.Area = account.User.Area;
            userInDb.Image = account.User.Image;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!AccountExists(id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }
            account.User = userInDb;
            return account;
        }
        //PUT: Đổi password của user -> profile
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
        [HttpPut("Password/{id}")]
        public async Task<ActionResult<AccountVM>> ChangePassword(int id, PasswordVM password)
        {
            var accountInDb = await _context.Accounts.Where(u => u.Id == id).FirstAsync();
            var r = _userManager.ChangePasswordAsync(accountInDb, password.CurrentPassword, password.NewPassword);
            if (r.Result.Succeeded) return Content("Success");
            else
            {
                var message = string.Join(", ", r.Result.Errors.Select(x => "Code " + x.Code + " Description" + x.Description));
                return Content(message);
            }
        }

        //PUT: Block user -> manage-accounts
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
        [Authorize(Roles = RolesHelper.SuperAdmin + "," + RolesHelper.Admin)]
        [HttpPut("Block/{id}")]
        public async Task<IActionResult> BlockAccount(int id, AccountVM account)
        {
            if (id != account.Id)
            {
                return BadRequest();
            }

            var accountInDB = _context.Accounts.Where(a => a.Id == id && a.IsDeleted == false).FirstOrDefault();
            accountInDB.LockoutEnabled = !account.IsActive;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!AccountExists(id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }

            return NoContent();
        }
        //POST: Login và trả về activities của user (phim đã like, rate vs review like/unlike) -> login-modal
        [HttpPost]
        [Route("Login")]
        public async Task<ActionResult<object>> Login(AccountVM account)
        {
            var accountInDB = await _context.Accounts.Where(a => a.UserName.ToLower() == account.Username.ToLower() && a.IsDeleted == false)
                                                     .Include(a => a.User)
                                                     .Include(a => a.Reviews).Include(a => a.MovieLikes).Include(a => a.ReviewLikes)
                                                     .FirstOrDefaultAsync();
            if (accountInDB == null) return NotFound();
            // Tìm thấy account nhưng ko phải role User vs Writer
            account.RoleName = _userManager.GetRolesAsync(accountInDB).Result.ToList()[0];
            if (account.RoleName != RolesHelper.User && account.RoleName != RolesHelper.Writer) return NotFound();
            // Account đúng role nhưng sai pass
            PasswordVerificationResult passresult = _userManager.PasswordHasher.VerifyHashedPassword(accountInDB, accountInDB.PasswordHash, account.Password);
            if (passresult == PasswordVerificationResult.Failed) return NotFound();

            if (!accountInDB.EmailConfirmed) return new JsonResult("email");
            if (accountInDB.LockoutEnabled) return new JsonResult("locked");
           
            account.Id = accountInDB.Id;
            account.Password = null;
            account.User.Image = accountInDB.User.Image;

            //var rates = await _context.Reviews.Where(r => r.AccountId == account.Id).ToListAsync();
            //var movieLikes = await _context.MovieLikes.Where(r => r.AccountId == account.Id).ToListAsync();
            //var reviewLikes = await _context.ReviewLikes
            //                                .Where(r => r.AccountId == account.Id)
            //                                .Select(r => new ReviewLike { AccountId = r.AccountId, ReviewId = r.ReviewId, Liked = r.Liked, DisLiked = r.DisLiked })
            //                                .ToListAsync();
            ActivityVM activity = new ActivityVM()
            {
                RateIds = accountInDB.Reviews.Where(r => !r.IsDeleted).Select(r => r.MovieId).ToList(),
                MovieLikeIds = accountInDB.MovieLikes.Select(r => r.MovieId).ToList(),
                ReviewLikes = accountInDB.ReviewLikes.Select(r => new ReviewLike { AccountId = r.AccountId, ReviewId = r.ReviewId, Liked = r.Liked, DisLiked = r.DisLiked }).ToList()
            };
            return new { Account = account, Activities = activity, Token = GenerateJwtToken(account.RoleName) };
        }

        //POST: Đăng kí account và gửi mail xác nhận -> register
        [HttpPost]
        public async Task<ActionResult> Register(AccountVM account)
        {
            var lstEmail = await _context.Accounts.Where(a => a.Email.ToLower() == account.Email.ToLower()).ToListAsync();
            var lstUsername = await _context.Accounts.Where(a => a.UserName.ToLower() == account.Username.ToLower()).ToListAsync();

            if (lstEmail.Count > 0 && lstUsername.Count > 0) return Content("username,email");
            else if (lstEmail.Count > 0) return Content("email");
            else if (lstUsername.Count > 0) return Content("username");

            Account accountInDB = new Account()
            {
                UserName = account.Username,
                Email = account.Email,
                EmailConfirmed = false,
                IsDeleted = false,
                CreatedDate = DateTime.Now,
                SecurityStamp = Guid.NewGuid().ToString()
            };
            var r = await _userManager.CreateAsync(accountInDB, account.Password);

            if (r.Succeeded)
            {
                var savedAccount = await _userManager.FindByNameAsync(account.Username);
                await _userManager.AddToRoleAsync(savedAccount, RolesHelper.User);

                User user = account.User;
                user.AccountId = savedAccount.Id;
                _context.Users.Add(user);
                await _context.SaveChangesAsync();

                string token = await this._userManager.GenerateEmailConfirmationTokenAsync(savedAccount);
                var callbackUrl = $"{ApiHelper.FrontEndHost_User}/verify?userId={savedAccount.Id}&code={Base64Token(token)}";

                await this._emailSender.SendEmailAsync(savedAccount.Email, "Xác nhận lập tài khoản thành công", $"Xin chào {savedAccount.UserName}, <br>" +
                    $"Bạn đã đăng ký thành công tài khoản, tuy nhiên bạn cần xác thực để kích hoạt tài khoản của bạn bằng cách nhấn vào đường dẫn sau <a href={callbackUrl}>here</a>");
                return Content(savedAccount.Id.ToString());
            }
            else
            {
                var message = string.Join(", ", r.Errors.Select(x => "Code " + x.Code + " Description" + x.Description));
                //return Content(message);
                return BadRequest();
                
            }
        }

        //POST: Xác nhận email -> verify-email
        [HttpPost]
        [Route("ConfirmEmail")]
        public async Task<ActionResult> ConfirmRegistration (ConfirmEmailVM confirmEmailVM)
        {
            if (string.IsNullOrWhiteSpace(confirmEmailVM.Code))
            {
                ModelState.AddModelError("", "Code are required");
                return BadRequest(ModelState);
            }
            var accountInDB = _context.Accounts.Where(a => a.Id == confirmEmailVM.AccountId && a.IsDeleted == false).FirstOrDefault();
            if (accountInDB == null) return NotFound();

            if (accountInDB.EmailConfirmed) return NoContent();

            var codeDecodedBytes = WebEncoders.Base64UrlDecode(confirmEmailVM.Code);
            var codeDecoded = Encoding.UTF8.GetString(codeDecodedBytes);
            IdentityResult result = await this._userManager.ConfirmEmailAsync(accountInDB, codeDecoded);
            if (result.Succeeded) return Content("Success");
            else
            {
                var message = string.Join(", ", result.Errors.Select(x => "Code " + x.Code + " Description" + x.Description));
                return Content(message);
            }
        }

        // POST: Super admin tạo account admin -> manage-accounts
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
        [Authorize(Roles = RolesHelper.SuperAdmin)]
        [HttpPost("Admin")]
        public async Task<ActionResult> PostAdminAccount(AccountVM account)
        {
            var lstEmail = await _context.Accounts.Where(a => a.Email.ToLower() == account.Email.ToLower()).ToListAsync();
            var lstUsername = await _context.Accounts.Where(a => a.UserName.ToLower() == account.Username.ToLower()).ToListAsync();

            if (lstEmail.Count > 0 && lstUsername.Count > 0) return Content("username,email");
            else if (lstEmail.Count > 0) return Content("email");
            else if (lstUsername.Count > 0) return Content("username");

            Account accountInDB = new Account() { Id = 0, UserName = account.Username, Email = account.Email, EmailConfirmed = false, LockoutEnabled = false, IsDeleted = false, CreatedDate = DateTime.Now, SecurityStamp = Guid.NewGuid().ToString() };
            var r = await _userManager.CreateAsync(accountInDB, account.Username);

            if (r.Succeeded)
            {
                var savedAccount = await _userManager.FindByNameAsync(account.Username);
                await _userManager.AddToRoleAsync(savedAccount, RolesHelper.Admin);

                User user = account.User;
                user.AccountId = savedAccount.Id;
                _context.Users.Add(user);
                await _context.SaveChangesAsync();

                string token = await this._userManager.GenerateEmailConfirmationTokenAsync(savedAccount);
                var callbackUrl = $"{ApiHelper.FrontEndHost_Admin}/verify?userId={savedAccount.Id}&code={Base64Token(token)}";
                
                await this._emailSender.SendEmailAsync(accountInDB.Email, "Xác nhận vai trò Admin", $"Xin chào {savedAccount.UserName}, <br>" +
                    $"Bạn đã được thêm vào hệ thống của website với vai trò Admin, trước tiên bạn cần xác thực để kích hoạt tài khoản bằng cách nhấn vào đường dẫn sau <a href={callbackUrl}>here</a>");
                return Content(savedAccount.Id.ToString());
            }
            else
            {
                return BadRequest();
                //var message = string.Join(", ", r.Errors.Select(x => "Code " + x.Code + " Description" + x.Description));
                //return Content(message);
            }
        }

        // DELETE: Xóa account -> manage-accounts
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
        [Authorize(Roles = RolesHelper.SuperAdmin + "," + RolesHelper.Admin)]
        [HttpDelete("{id}")]
        public async Task<ActionResult<Account>> DeleteAccount(int id)
        {
            var account = await _context.Accounts.FindAsync(id);
            if (account == null) return NotFound();
            account.IsDeleted = true;

            var movieLikes = await _context.MovieLikes.Where(m => m.AccountId == id).ToListAsync();
            _context.MovieLikes.RemoveRange(movieLikes);
            var reviewLikes = await _context.ReviewLikes.Where(m => m.AccountId == id).ToListAsync();
            _context.ReviewLikes.RemoveRange(reviewLikes);
            var reviews = await _context.Reviews.Where(m => m.AccountId == id).ToListAsync();
            reviews.ForEach(review => { review.IsDeleted = true; });
            await _context.SaveChangesAsync();

            return account;
        }

        //[HttpGet("Storage/{accountId}")]
        //public async Task<ActionResult<object>> GetActivityStorage(int accountId)
        //{
        //    var rates = await _context.Reviews.Where(r => r.AccountId == accountId && r.IsDeleted == false).ToListAsync();
        //    var movieLikes = await _context.MovieLikes.Where(r => r.AccountId == accountId).ToListAsync();
        //    var reviewLikes = await _context.MovieLikes.Where(r => r.AccountId == accountId).ToListAsync();

        //    return new { RateIds = rates.Select(r => r.Id).ToList(), MovieLikeIds = movieLikes.Select(r => r.MovieId).ToList(), ReviewLikes = reviewLikes };
        //}

        private bool AccountExists(int id)
        {
            return _context.Accounts.Any(e => e.Id == id);
        }
        // Chuyển token về dạng base64
        private string Base64Token(string token)
        {
            byte[] tokenGeneratedBytes = Encoding.UTF8.GetBytes(token);
            return WebEncoders.Base64UrlEncode(tokenGeneratedBytes);
        }

        //Gửi email reset password -> send-email
        [HttpGet("SendEmailResetPassword")]
        public async Task<ActionResult> SendEmailResetPassword([FromQuery(Name="email")] string email)
        {
            var accountInDb = await _context.Accounts.Where(a => a.Email.ToLower() == email.ToLower() && a.IsDeleted == false).FirstOrDefaultAsync();
            if (accountInDb == null) return NoContent();
            string token = await this._userManager.GeneratePasswordResetTokenAsync(accountInDb);
            string role = _userManager.GetRolesAsync(accountInDb).Result.ToList()[0];
            var callbackUrl = $"{(role == RolesHelper.Admin || role == RolesHelper.SuperAdmin ? ApiHelper.FrontEndHost_Admin : ApiHelper.FrontEndHost_User)}/reset?userId={accountInDb.Id}&code={Base64Token(token)}";
            await this._emailSender.SendEmailAsync(accountInDb.Email, "Đặt lại mật khẩu", $"Xin chào {accountInDb.UserName}, <br>" +
                $"Bạn có thể đặt lại mật khẩu cho tài khoản của mình bằng cách nhấn vào đường dẫn sau <a href={callbackUrl}>here</a>");
            accountInDb.LockoutEnabled = true;
            await _context.SaveChangesAsync();
            return new JsonResult(accountInDb.Id.ToString());
        }

        //POST: Đặt lại mật khẩu -> reset-password
        [HttpPost("ResetPassword")]
        public async Task<ActionResult> ResetPassword(ResetPasswordVM resetPassword)
        {
            if (string.IsNullOrWhiteSpace(resetPassword.Code))
            {
                ModelState.AddModelError("", "Code are required");
                return BadRequest(ModelState);
            }
            var accountInDB = _context.Accounts.Where(a => a.Id == resetPassword.AccountId && a.IsDeleted == false).FirstOrDefault();
            if (accountInDB == null) return NotFound();

            var codeDecodedBytes = WebEncoders.Base64UrlDecode(resetPassword.Code);
            var codeDecoded = Encoding.UTF8.GetString(codeDecodedBytes);
            IdentityResult result = await _userManager.ResetPasswordAsync(accountInDB, codeDecoded, resetPassword.Password);
            if (result.Succeeded)
            {
                accountInDB.LockoutEnabled = false;
                await _context.SaveChangesAsync();
                return new JsonResult("Success");
            }
            else
            {
                var message = string.Join(", ", result.Errors.Select(x => "Code " + x.Code + " Description" + x.Description));
                return new JsonResult(message);
            }
        }

        private readonly string GoogleClientId = "1096081760606-a7r7k1hr273ggvoji86ejurmd3lderp6.apps.googleusercontent.com";
        public async Task<GoogleJsonWebSignature.Payload> VerifyGoogleToken(ExternalAuthDto externalAuth)
        {
            try
            {
                var settings = new GoogleJsonWebSignature.ValidationSettings()
                {
                    Audience = new List<string>() { GoogleClientId }
                };
                var payload = await GoogleJsonWebSignature.ValidateAsync(externalAuth.Token, settings);
                return payload;
            }
            catch (Exception) { return null; }
        }

        [HttpPost]
        [Route("LoginGoogle")]
        public async Task<ActionResult<object>> LoginGoogle(ExternalAuthDto externalAuth)
        {
            var payload = await VerifyGoogleToken(externalAuth);
            if (payload == null) return BadRequest();
            //Lấy account của user từ email trong payload
            var accountInDB = await _context.Accounts
                                            .Where(a => a.Email.ToLower() == payload.Email.ToLower() && a.IsDeleted == false)
                                            .Include(a => a.User)
                                            .Include(a => a.Reviews).Include(a => a.MovieLikes).Include(a => a.ReviewLikes)
                                            .FirstOrDefaultAsync();
            if (accountInDB == null) return NotFound();
            AccountVM account = new AccountVM();
            account.RoleName = _userManager.GetRolesAsync(accountInDB).Result.ToList()[0];
            if (account.RoleName != RolesHelper.User && account.RoleName != RolesHelper.Writer) return NotFound();

            if (!accountInDB.EmailConfirmed) return new JsonResult("email");
            if (accountInDB.LockoutEnabled) return new JsonResult("locked");
            //Gửi account của user về frontend
            account.Id = accountInDB.Id;
            account.Username = accountInDB.UserName;
            account.Password = null;
            account.User.Image = accountInDB.User.Image;

            ActivityVM activity = new ActivityVM()
            {
                RateIds = accountInDB.Reviews.Where(r => !r.IsDeleted).Select(r => r.MovieId).ToList(),
                MovieLikeIds = accountInDB.MovieLikes.Select(r => r.MovieId).ToList(),
                ReviewLikes = accountInDB.ReviewLikes.Select(r => new ReviewLike { AccountId = r.AccountId, ReviewId = r.ReviewId, Liked = r.Liked, DisLiked = r.DisLiked }).ToList()
            };
            return new { Account = account, Activities = activity, Token = GenerateJwtToken(account.RoleName) };
        }

        [HttpPost]
        [Route("LoginFacebook")]
        public async Task<ActionResult<object>> LoginFacebook(ExternalAuthDto externalAuth)
        {
            //check token
            var httpClient = new HttpClient { BaseAddress = new Uri("https://graph.facebook.com/v2.9/") };
            var response = await httpClient.GetAsync($"me?access_token={externalAuth.Token}&fields=id,name,email,first_name,last_name,age_range,birthday,gender,locale,picture");
            if (!response.IsSuccessStatusCode) return BadRequest();
            var result = await response.Content.ReadAsStringAsync();
            var facebookAccount = JsonConvert.DeserializeObject<FacebookUserData>(result);
            //Lấy account của user từ email trong payload
            var accountInDB = await _context.Accounts
                                            .Where(a => a.Email.ToLower() == facebookAccount.Email.ToLower() && a.IsDeleted == false)
                                            .Include(a => a.Reviews).Include(a => a.MovieLikes).Include(a => a.ReviewLikes)
                                            .Include(a => a.User).FirstOrDefaultAsync();
            if (accountInDB == null) return NotFound();
            AccountVM account = new AccountVM();
            account.RoleName = _userManager.GetRolesAsync(accountInDB).Result.ToList()[0];
            if (account.RoleName != RolesHelper.User && account.RoleName != RolesHelper.Writer) return NotFound();

            if (!accountInDB.EmailConfirmed) return new JsonResult("email");
            if (accountInDB.LockoutEnabled) return new JsonResult("locked");
            //Gửi account của user về frontend
            account.Id = accountInDB.Id;
            account.Username = accountInDB.UserName;
            account.Password = null;
            account.User.Image = accountInDB.User.Image;

            ActivityVM activity = new ActivityVM()
            {
                RateIds = accountInDB.Reviews.Where(r => !r.IsDeleted).Select(r => r.MovieId).ToList(),
                MovieLikeIds = accountInDB.MovieLikes.Select(r => r.MovieId).ToList(),
                ReviewLikes = accountInDB.ReviewLikes.Select(r => new ReviewLike { AccountId = r.AccountId, ReviewId = r.ReviewId, Liked = r.Liked, DisLiked = r.DisLiked }).ToList()
            };
            return new { Account = account, Activities = activity, Token=GenerateJwtToken(account.RoleName) }; 
        }
        // POST: Super admin tạo account writer -> add-admin-modal
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
        [Authorize(Roles = RolesHelper.SuperAdmin)]
        [HttpPost]
        [Route("Writer")]
        public async Task<ActionResult> PostWriterAccount(AccountVM account)
        {
            var lstEmail = await _context.Accounts.Where(a => a.Email.ToLower() == account.Email.ToLower()).ToListAsync();
            var lstUsername = await _context.Accounts.Where(a => a.UserName.ToLower() == account.Username.ToLower()).ToListAsync();

            if (lstEmail.Count > 0 && lstUsername.Count > 0) return Content("username,email");
            else if (lstEmail.Count > 0) return Content("email");
            else if (lstUsername.Count > 0) return Content("username");

            Account accountInDB = new Account() { Id = 0, UserName = account.Username, Email = account.Email, EmailConfirmed = false, LockoutEnabled = false, IsDeleted = false, CreatedDate = DateTime.Now, SecurityStamp = Guid.NewGuid().ToString() };
            var r = await _userManager.CreateAsync(accountInDB, account.Username);

            if (r.Succeeded)
            {
                var savedAccount = await _userManager.FindByNameAsync(account.Username);
                await _userManager.AddToRoleAsync(savedAccount, RolesHelper.Writer);

                User user = account.User;
                user.AccountId = savedAccount.Id;
                _context.Users.Add(user);
                await _context.SaveChangesAsync();

                string token = await this._userManager.GenerateEmailConfirmationTokenAsync(savedAccount);
                var callbackUrl = $"{ApiHelper.FrontEndHost_User}/verify?userId={savedAccount.Id}&code={Base64Token(token)}";

                await this._emailSender.SendEmailAsync(accountInDB.Email, "Xác nhận vai trò Writer", $"Xin chào {savedAccount.UserName}, <br>" +
                    $"Bạn đã được thêm vào hệ thống của website với vai trò Writer, trước tiên bạn cần xác thực để kích hoạt tài khoản bằng cách nhấn vào đường dẫn sau <a href={callbackUrl}>here</a>");
                return Content(savedAccount.Id.ToString());
            }
            else return BadRequest();
        }

        [HttpPost]
        [Route("LoginAdmin")]
        public async Task<ActionResult<object>> LoginAdmin(AccountVM account)
        {
            var accountInDB = await _context.Accounts.Where(a => a.UserName.ToLower() == account.Username.ToLower() && a.IsDeleted == false)
                                                     .Include(a => a.User).FirstOrDefaultAsync();
            //Không tìm thấy account
            if (accountInDB == null) return NotFound(); 
            // Tìm thấy account nhưng ko phải role Super Admin vs Admin
            account.RoleName = _userManager.GetRolesAsync(accountInDB).Result.ToList()[0];
            if (account.RoleName != RolesHelper.SuperAdmin && account.RoleName != RolesHelper.Admin) return NotFound();
            // Account đúng role nhưng sai pass
            PasswordVerificationResult passresult = _userManager.PasswordHasher.VerifyHashedPassword(accountInDB, accountInDB.PasswordHash, account.Password);
            if (passresult == PasswordVerificationResult.Failed) return NotFound();
            // Account chưa confirm email hay account bị lock
            if (!accountInDB.EmailConfirmed) return new JsonResult("email");
            if (accountInDB.LockoutEnabled) return new JsonResult("locked");            
            account.Id = accountInDB.Id;
            account.Password = null;
            account.User.Image = accountInDB.User.Image;
            return new { Account = account, Token = GenerateJwtToken(account.RoleName) };
        }

        // POST: Lấy info của admin -> app (Admin)
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
        [Authorize(Roles = RolesHelper.Admin + "," + RolesHelper.SuperAdmin)]
        [HttpPost("AdminInfo")]
        public async Task<ActionResult<AccountVM>> AdminInfo(AccountVM account)
        {
            var accountInDB = await _context.Accounts.Where(a => a.Id == account.Id && a.IsDeleted == false).Include(a => a.User).FirstOrDefaultAsync();
            //Không tìm thấy account
            if (accountInDB == null) return NotFound();
            // Tìm thấy account nhưng ko phải role Super Admin vs Admin
            account.RoleName = _userManager.GetRolesAsync(accountInDB).Result.ToList()[0];
            if (account.RoleName != RolesHelper.SuperAdmin && account.RoleName != RolesHelper.Admin) return NotFound();
            account.Id = accountInDB.Id;
            account.Password = null;
            account.User.Image = accountInDB.User.Image;
            return account;
        }

        // POST: Lấy info của user -> app (User)
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
        [Authorize(Roles = RolesHelper.User + "," + RolesHelper.Writer)]
        [HttpPost("UserInfo")]
        public async Task<ActionResult<object>> UserInfo(AccountVM account)
        {
            var accountInDB = await _context.Accounts.Where(a => a.Id == account.Id && a.IsDeleted == false)
                                                     .Include(a => a.Reviews).Include(a => a.MovieLikes).Include(a => a.ReviewLikes)
                                                     .Include(a => a.User)
                                                     .FirstOrDefaultAsync();
            //Không tìm thấy account
            if (accountInDB == null) return NotFound();
            //// Tìm thấy account nhưng ko phải role Super Admin vs Admin
            //account.RoleName = _userManager.GetRolesAsync(accountInDB).Result.ToList()[0];
            //if (account.RoleName != RolesHelper.User && account.RoleName != RolesHelper.Writer) return NotFound();
            account.Id = accountInDB.Id;
            account.Username = accountInDB.UserName;
            account.Password = null;
            account.User.Image = accountInDB.User.Image;
            ActivityVM activity = new ActivityVM()
            {
                RateIds = accountInDB.Reviews.Where(r => !r.IsDeleted).Select(r => r.MovieId).ToList(),
                MovieLikeIds = accountInDB.MovieLikes.Select(r => r.MovieId).ToList(),
                ReviewLikes = accountInDB.ReviewLikes.Select(r => new ReviewLike { AccountId = r.AccountId, ReviewId = r.ReviewId, Liked = r.Liked, DisLiked = r.DisLiked }).ToList()
            };
            return new { Account = account, Activities = activity };
        }

        public string GenerateJwtToken(string userRole)
        {
            var claims = new List<Claim> { new Claim(ClaimTypes.Role, userRole) };
            var secretKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_appSettings.SecretKey));
            var signinCredentials = new SigningCredentials(secretKey, SecurityAlgorithms.HmacSha256);
            var tokeOptions = new JwtSecurityToken(
                issuer: ApiHelper.MainBEHost,
                audience: ApiHelper.MainBEHost,
                claims: claims,
                expires: DateTime.Now.AddDays(2),
                signingCredentials: signinCredentials
            );
            return new JwtSecurityTokenHandler().WriteToken(tokeOptions);
        }
    }
    public class ExternalAuthDto
    {
        public string Provider { get; set; }
        public string Token { get; set; }
    }
    public class FacebookUserData
    {
        public long Id { get; set; }
        public string Email { get; set; }
        public string Name { get; set; }
        [JsonProperty("first_name")]
        public string FirstName { get; set; }
        [JsonProperty("last_name")]
        public string LastName { get; set; }
        public string Gender { get; set; }
        public string Locale { get; set; }
    }
}
