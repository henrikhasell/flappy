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
            IList<Score> scores = await database.Scores
                .OrderByDescending(i => i.Value).ThenBy(i => i.Time).ToListAsync();

            return View(scores);
        }

        [HttpPost]
        public async Task<IActionResult> Leaderboard([Bind("Name","Value")]Score score, bool? validate=true)
        {
            if(ModelState.IsValid)
            {
                score.Time = DateTime.Now;
                score.Address = HttpContext.Connection.RemoteIpAddress.ToString();

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

        public IActionResult Share()
        {
            return View();
        }
    }
}
