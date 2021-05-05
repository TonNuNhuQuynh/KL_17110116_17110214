using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.NetworkInformation;
using System.Threading.Tasks;

namespace MovieReviewsAndTickets_API.Helpers
{
    public class ApiHelper
    {
        public static string CinemaChainHost = "https://localhost:44302";
        public static string MainBEHost = "https://localhost:44320";
        public static string FrontEndHost_Admin = "http://localhost:4200/#";
        public static string FrontEndHost_User = "http://localhost:5000/#";
        //public static string CinemaChainHost = "https://tlcn-cinemachain.somee.com";
        //public static string FrontEndHost = "https://movie-reviews-and-tickets.web.app/#";
    }
}
