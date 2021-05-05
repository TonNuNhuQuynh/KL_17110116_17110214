using MovieReviewsAndTickets_API.Helpers;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace MovieReviewsAndTickets_API.Services
{
    public class NotificationHelper
    {
        public static (string, string) AssignTaskNoti (string admin, int taskId)
        {
            return ($"{admin} giao cho bạn task mới", $"{ApiHelper.FrontEndHost_User}/writer/task-details?id={taskId}");
        }
        public static (string, string) UpdateTaskNoti(string admin, string task, int taskId)
        {
            return ($"{admin} đã cập nhật task '{task}'", $"{ApiHelper.FrontEndHost_User}/writer/task-details?id={taskId}");
        }
        public static (string, string) DenyTaskNoti (string writer, int taskId)
        {
            return ($"{writer} từ chối task mà bạn đã giao", $"{ApiHelper.FrontEndHost_Admin}/admin/manage-tasks?id={taskId}");
        }
        public static (string, string) AcceptTaskNoti(string writer, int taskId)
        {
            return ($"{writer} chấp nhận task mà bạn đã giao", $"{ApiHelper.FrontEndHost_Admin}/admin/manage-tasks?id={taskId}");
        }
        public static (string, string) SendPostNoti(string writer, string task, int postId)
        {
            return ($"{writer} đã gửi cho bạn bài viết của task '{task}'", $"{ApiHelper.FrontEndHost_Admin}/admin/review-post?id={postId}");
        }
        public static (string, string) UpdatePostNoti(string writer, int postId)
        {
            return ($"{writer} đã cập nhật bài viết sau khi gửi", $"{ApiHelper.FrontEndHost_Admin}/admin/review-post?id={postId}");
        }
        public static (string, string) FeedbackPostNoti(string admin, int postId)
        {
            return ($"{admin} đã gửi feedback cho bài viết của bạn", $"{ApiHelper.FrontEndHost_User}/review?id={postId}");
        }
    }
}
