
using Flappy.Models;
using Microsoft.EntityFrameworkCore;

namespace Flappy
{
    public class DatabaseContext : DbContext
    {
        public DatabaseContext(DbContextOptions<DatabaseContext> options)
            : base(options)
        {
        }

        public DbSet<Game> Games { set; get; }

        public DbSet<Score> Scores { set; get; }
    }
}