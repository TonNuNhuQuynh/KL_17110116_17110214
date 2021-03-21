using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;

namespace MovieReviewsAndTickets_API.Models
{
    public class Task
    {
        [Key]
        public int Id { get; set; }
        public string Title { get; set; }         // Tên của task
        public string Content { get; set; }       // Nội dung task
        public DateTime CreatedDate { get; set; } // Ngày giờ tạo
        public DateTime Deadline { get; set; }    // Deadline của task
        public Account Creator { get; set; }      // Người tạo task
        public int CreatorId { get; set; }
        public Account Executer { get; set; }    // Người được giao task
        public int? ExecuterId { get; set; }
        public byte Status { get; set; }         // Trạng thái task, 0: chưa giao, 1: chờ phản hồi, 2: đang thực hiện, 3: hoàn thành chưa duyệt, 4: hoàn thành đã duyệt
        public Post Post { get; set; }           // Id của post ứng vs task mà người được giao đã viết
        public int? PostId { get; set; }
        public bool IsDeleted { get; set; }       // Task có bị xóa
        public DateTime? AssignTime { get; set; } // Thời gian mà task đc assign cho user, vì sau 2 tiếng task user ko response, admin có quyền edit task cho user khác
    }
}
