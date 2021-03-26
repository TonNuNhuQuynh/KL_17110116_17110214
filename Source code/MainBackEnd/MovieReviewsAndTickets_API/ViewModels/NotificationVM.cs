using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace MovieReviewsAndTickets_API.ViewModels
{
    public class NotificationVM
    {
        public int Id { get; set; }
        public string Message { get; set; }
        public string Url { get; set; }
        public DateTime CreatedDate { get; set; }
        public string SenderImage { get; set; }
        public string SenderName { get; set; }
    }
}
