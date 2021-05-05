using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;

namespace MovieReviewsAndTickets_API.Models
{
    public class Post
    {
        [Key]
        public int Id { get; set; }
        public string Title { get; set; }       // Tựa bài viết
        public string Summary { get; set; }     // Tóm tắt bài viết
        public string Cover { get; set; }       // Hình nền bài viết
        public string Content { get; set; }     // Nội dung
        public PostType PostType { get; set; }  // Loại bài viết
        public byte PostTypeId { get; set; } 
        public PostTheme PostTheme { get; set; } // Chuyên đề bài viết
        public byte? PostThemeId { get; set; }
        public bool Spoilers { get; set; }       // Có chứa spoiler ko
        public Movie Movie { get; set; }         // Liên quan tới phim nào
        public int? MovieId { get; set; }
        public string Keywords { get; set; }     // Các từ khóa
        public byte Status { get; set; }         // Trạng thái post, 0: chưa nộp, 1: đã gửi biên tập, 2: đã được đăng
        public Account Account { get; set; }     // Người viết bài
        public int AccountId { get; set; }
        public Task Task { get; set; }           // Task mà post thuộc về
        public bool IsDeleted { get; set; }             // Bài đăng bị gỡ?
        public DateTime? PublishedDate { get; set; }    // Ngày admin xuất bản bài viết
        public DateTime CreatedDate { get; set; }       // Ngày user tạo bài viết
        public ICollection<Feedback> Feedbacks { get; set; }  // Feedback từ phía admin, super admin
    }
}
