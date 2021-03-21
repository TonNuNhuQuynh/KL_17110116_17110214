using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;

namespace MovieReviewsAndTickets_API.Models
{
    public class Notification
    {
        [Key]
        public int Id { get; set; }
        public string Message { get; set; }
        public string Url { get; set; }
        public Account Receiver { get; set; }    // Người nhận noti
        public int ReceiverId { get; set; }
        public Account Sender { get; set; }     // Người gửi noti
        public int SenderId { get; set; }
        public DateTime CreatedDate { get; set; }
        public bool IsViewed { get; set; }
    }
}
