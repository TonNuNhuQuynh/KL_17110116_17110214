using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
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
    [Route("api/[controller]")]
    [ApiController]
    public class TasksController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IHubContext<BroadcastService> _hubContext;
        private readonly IConnectionMapping<int> _connections;
        private IEmailSender _emailSender;
        public TasksController(ApplicationDbContext context, IHubContext<BroadcastService> hubContext, IConnectionMapping<int> connectionMapping, IEmailSender emailSender)
        {
            _context = context;
            _hubContext = hubContext;
            _connections = connectionMapping;
            _emailSender = emailSender;
        }

        // GET: Lấy list các task -> manage-tasks
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Models.Task>>> GetTasks()
        {
            var tasks = await _context.Tasks.Where(t => !t.IsDeleted).Include(t => t.Creator).Include(t => t.Executer).OrderByDescending(t => t.CreatedDate).ToListAsync();
            tasks.ForEach(t => {
                if (t.Executer != null) t.Executer = new Account() { UserName = t.Executer.UserName, Id = t.Executer.Id };
                t.Creator = new Account() { UserName = t.Creator.UserName, Id = t.Creator.Id };
            });
            return tasks;
        }

        // GET: api/Tasks/5 - Lấy chi tiết task trong -> task-modal
        [HttpGet("{id}")]
        public async Task<ActionResult<Models.Task>> GetTask(int id)
        {
            var task = await _context.Tasks.Where(t => t.Id == id && !t.IsDeleted).Include(t => t.Executer).Include(t => t.Creator).FirstOrDefaultAsync();
            if (task == null) return NotFound();
            if (task.Executer != null) task.Executer = new Account() { UserName = task.Executer.UserName, Id = task.Executer.Id, Email = "", EmailConfirmed = false, LockoutEnabled = false, IsDeleted = false, CreatedDate = DateTime.Now, SecurityStamp = Guid.NewGuid().ToString() };
            task.Creator = new Account() { UserName = task.Creator.UserName, Id = task.Creator.Id };
            return task;
        }

        // PUT: api/Tasks/5 - Update task -> task-modal
        [HttpPut("{id}")]
        public async Task<IActionResult> PutTask(int id, Models.Task task)
        {
            if (id != task.Id) return BadRequest();
            var taskInDB = await _context.Tasks.Where(t => !t.IsDeleted && t.Id == id).FirstOrDefaultAsync();
            if (taskInDB == null) return NotFound();
            //task.Deadline = task.Deadline.AddHours(7);
            taskInDB.Title = task.Title;
            taskInDB.Content = task.Content;
            taskInDB.Deadline = task.Deadline.AddHours(7);
            Account admin = null;
            Notification notification = null;
            int? oldExecuterId = taskInDB.ExecuterId;
            // Assign task cho user mới
            if (task.ExecuterId != null)
            {
                taskInDB.Status = task.ExecuterId != taskInDB.ExecuterId ? TaskHelper.WaitingT : taskInDB.Status;
                taskInDB.AssignTime = task.ExecuterId != taskInDB.ExecuterId ? DateTime.Now : taskInDB.AssignTime;
                // Tạo notification mới gửi đến user đc assign
                admin = await _context.Accounts.Where(a => !a.IsDeleted && a.Id == task.CreatorId).Include(a => a.User).FirstOrDefaultAsync();
                notification = new Notification() { ReceiverId = (int)task.ExecuterId, CreatedDate = DateTime.Now, SenderId = task.CreatorId };
                (notification.Message, notification.Url) = task.ExecuterId != taskInDB.ExecuterId ? NotificationHelper.AssignTaskNoti(admin.UserName, id) : NotificationHelper.UpdateTaskNoti(admin.UserName, task.Title, id);
                _context.Notifications.Add(notification);
                taskInDB.ExecuterId = task.ExecuterId;
            }
            // Sửa task nhưng không assign cho ai
            else
            {
                taskInDB.ExecuterId = task.ExecuterId;
                taskInDB.Status = TaskHelper.UnAssignedT;
                taskInDB.AssignTime = null;
            }
            await _context.SaveChangesAsync();
            // Sau khi đã lưu hết thì gửi emai vs broadcast noti
            if (task.Status >= TaskHelper.WaitingT)
            {
                var receiver = await _context.Accounts.Where(a => !a.IsDeleted && a.Id == task.ExecuterId).FirstOrDefaultAsync();
                //Nếu writer cũ khác writer mới thì gửi email vs noti cho writer đc assign task
                //if (oldExecuterId != taskInDB.ExecuterId)
                //{
                //    string link = $"{notification.Url}&view={notification.Id}";
                //    await this._emailSender.SendEmailAsync(receiver.Email, taskInDB.Title, $"Xin chào {receiver.UserName}, <br>" +
                //            $"{admin.UserName} giao cho bạn task <strong>{taskInDB.Title}</strong> với nội dung là:<br>" +
                //            $"{taskInDB.Content}" +
                //            $"<br>Deadline: {taskInDB.Deadline.ToString("dd/MM/yyyy HH:mm")}" +
                //            $"<br>Từ chối hoặc chấp nhận task <a href=\"{link}\">tại đây</a>");
                //}    
                SendMessage(new NotificationVM() { Id = notification.Id, Url = notification.Url, CreatedDate = notification.CreatedDate, Message = notification.Message, SenderImage = admin.User.Image, SenderName = admin.UserName }, notification.ReceiverId);
            }
            return NoContent();
        }

        // POST: api/Tasks - Tạo task mới
        [HttpPost]
        public async Task<IActionResult> PostTask(Models.Task task)
        {
            task.CreatedDate = DateTime.Now;
            task.Deadline = task.Deadline.AddHours(7);    // Kiểu date gửi từ backend xuống hour bị giảm đi 7
            if (task.ExecuterId != 0 && task.ExecuterId != null)  // Nếu đc assign cho user thì gán lại status là chờ phản hồi và assignTime
            {
                task.Status = TaskHelper.WaitingT;
                task.AssignTime = DateTime.Now;
            }
            else
            {
                task.Status = TaskHelper.UnAssignedT;
                task.AssignTime = null;
            }
            _context.Tasks.Add(task);
            await _context.SaveChangesAsync();

            if (task.ExecuterId != 0 && task.ExecuterId != null)  // Nếu đc assign cho user thì gán lại status là chờ phản hồi và assignTime
            {
                // Tạo notification mới gửi đến user đc assign
                var admin = await _context.Accounts.Where(a => !a.IsDeleted && a.Id == task.CreatorId).Include(a => a.User).FirstOrDefaultAsync();
                var notification = new Notification() { ReceiverId = (int)task.ExecuterId, CreatedDate = DateTime.Now, SenderId = task.CreatorId };
                (notification.Message, notification.Url) = NotificationHelper.AssignTaskNoti(admin.UserName, task.Id);
                _context.Notifications.Add(notification);
                await _context.SaveChangesAsync();
                var receiver = await _context.Accounts.Where(a => !a.IsDeleted && a.Id == task.ExecuterId).FirstOrDefaultAsync();
                //Gửi email vs noti cho writer đc assign task
                //string link = $"{notification.Url}&view={notification.Id}";
                //await this._emailSender.SendEmailAsync(receiver.Email, task.Title, $"Xin chào {receiver.UserName}, <br>" +
                //        $"{admin.UserName} giao cho bạn task <strong>{task.Title}</strong> với nội dung là:<br>" +
                //        $"{task.Content}" +
                //        $"<br>Deadline: {task.Deadline.ToString("dd/MM/yyyy HH:mm")}" +
                //        $"<br>Từ chối hoặc chấp nhận task <a href=\"{link}\">tại đây</a>");
                SendMessage(new NotificationVM() { Id = notification.Id, Url = notification.Url, CreatedDate = notification.CreatedDate, Message = notification.Message, SenderImage = admin.User.Image, SenderName = admin.UserName }, notification.ReceiverId);
            }
            return new JsonResult(task.Id);
        }

        // DELETE: api/Tasks/5  - Xóa task -> manage-tasks
        [HttpDelete("{id}")]
        public async Task<ActionResult<Models.Task>> DeleteTask(int id)
        {
            var task = await _context.Tasks.FindAsync(id);
            if (task == null) return NotFound();
            task.IsDeleted = true;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        private bool TaskExists(int id)
        {
            return _context.Tasks.Any(e => e.Id == id);
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
