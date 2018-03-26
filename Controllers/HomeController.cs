using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Flappy.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Flappy.Controllers
{
    public class HomeController : Controller
    {
        private readonly DatabaseContext database;

        public HomeController(DatabaseContext database)
        {
            this.database = database;
        }

        public IActionResult Index()
        {
            return View();
        }

        [HttpGet]
        public async Task<IActionResult> Leaderboard()
        {
            IOrderedQueryable<Score> scores = database.Scores
                .OrderByDescending(i => i.Value).ThenBy(i => i.Time);

            DateTime pastWeek = DateTime.Now.AddDays(-7);
            DateTime pastMonth = DateTime.Now.AddDays(-30);

            ViewBag.Top10ThisWeek = await scores.Where(i => i.Time >= pastWeek).Take(10).ToListAsync();
            ViewBag.Top10ThisMonth = await scores.Where(i => i.Time >= pastMonth).Take(10).ToListAsync();
            ViewBag.Top10AllTime = await scores.Take(10).ToListAsync();

            return View();
        }

        [HttpPost, ValidateAntiForgeryToken]
        public async Task<IActionResult> Leaderboard([Bind("Name","Value")]Score score, bool? validate=true)
        {
            if(ModelState.IsValid)
            {
                score.Time = DateTime.Now;

                score.Address = HttpContext.Request.Headers["X-Forwarded-For"];

                if(score.Address == null)
                {
                    score.Address = HttpContext.Connection.RemoteIpAddress.ToString();
                }

                await database.Scores.AddAsync(score);
                await database.SaveChangesAsync();

                return RedirectToAction("Leaderboard");
            }
            else
            {
                ViewBag.Validate = validate;
                return View("SubmitScore", score);
            }
        }

        public IActionResult About()
        {
            return View();
        }

        [HttpPost]
        public async Task<IActionResult> SubmitGame([Bind("Score")]Game game)
        {
            if(!ModelState.IsValid)
            {
                return BadRequest();
            }
            
            game.Address = HttpContext.Request.Headers["X-Forwarded-For"];

            if(game.Address == null)
            {
                game.Address = HttpContext.Connection.RemoteIpAddress.ToString();
            }
            
            game.Time = DateTime.Now;

            await database.Games.AddAsync(game);
            await database.SaveChangesAsync();

            return Ok();
        }
    }
}
