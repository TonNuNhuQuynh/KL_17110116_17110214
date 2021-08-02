using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace MovieReviewsAndTickets_API.Helpers
{
    public static class HostingTimeZone
    {
        public static DateTime Now => ApiHelper.MainBEHost.Contains("localhost")? DateTime.Now: DateTime.Now.AddHours(14);
    }
}
