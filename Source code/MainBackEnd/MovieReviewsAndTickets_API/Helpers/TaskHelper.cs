using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace MovieReviewsAndTickets_API.Helpers
{
    public class TaskHelper
    {
        public static byte UnAssignedT = 0;
        public static byte WaitingT = 1;
        public static byte ProcessingT = 2;
        public static byte UnApprovedT = 3;
        public static byte ApprovedT = 4;
    }
}
