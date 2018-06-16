using Flappy.Settings;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Npgsql.EntityFrameworkCore.PostgreSQL;

namespace Flappy
{
    public class Startup
    {
        private readonly IConfiguration configuration;

        public Startup(IConfiguration configuration)
        {
            this.configuration = configuration;
        }

        public void ConfigureServices(IServiceCollection services)
        {
            services.Configure<GoogleAnalyticsSettings>(options => {
                options.TrackingId = "UA-115467440-1";
            });
            services.Configure<OpenGraphSettings>(options => {
                options.FacebookAppId = "282422095623841";
            });
            services.AddMvc();
            services.AddDbContext<DatabaseContext>(options =>
                options.UseNpgsql(@"Host=database.service;Database=entitycore;Username=postgres;Password=postgres"));
        }

        public void Configure(IApplicationBuilder application, IHostingEnvironment environment)
        {
            if (environment.IsDevelopment())
            {
                application.UseDeveloperExceptionPage();
            }

            //application.UseStaticFiles();

            application.UseMvc(routes =>
            {
                routes.MapRoute(
                    name: "default",
                    template: "{controller=Home}/{action=Index}/{id?}");
            });
        }
    }
}
