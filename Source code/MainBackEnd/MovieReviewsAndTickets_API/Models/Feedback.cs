using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace MovieReviewsAndTickets_API.Models
{
    public class Feedback
    {
        public Post Post { get; set; }
        public int PostId { get; set; }
        public Account Account { get; set; }
        public int AccountId { get; set; }
        public DateTime CreatedDate { get; set; }
        public string Content { get; set; }
    }
}
