using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace MovieReviewsAndTickets_API.Services.SignalR
{
    public interface IConnectionMapping<T>
    {
        void Add(T key, string connectionId);
        IEnumerable<string> GetConnections(T key);
        void Remove(T key, string connectionId);

    }
}
